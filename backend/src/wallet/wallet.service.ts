import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DriverNotificationType,
  Prisma,
  RidePaymentMethod,
  TopUpMethod,
  TopUpStatus,
  WalletTransactionType,
} from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { StructuredLogger } from '../common/logging/structured-logger';

/**
 * Default platform commission when settings are missing (matches seeded `commissionSettings`).
 * Runtime deductions use `commissionRateDecimal` from app settings (see `applyCommissionForCompletedRide`).
 */
export const DEFAULT_PLATFORM_COMMISSION_RATE = 0.05;

/** Wallet balance cannot go below this (ETB). Commission debit is capped to available funds above the floor. */
export const MIN_WALLET_BALANCE_FLOOR = 0;

const DEFAULT_MIN_BALANCE = 100;
const DEFAULT_WARNING_THRESHOLD = 300;

@Injectable()
export class WalletService {
  private readonly logger = new StructuredLogger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async ensureWallet(driverId: string): Promise<void> {
    await this.prisma.driverWallet.upsert({
      where: { driverId },
      create: {
        driverId,
        balance: 0,
        minBalance: DEFAULT_MIN_BALANCE,
        warningThreshold: DEFAULT_WARNING_THRESHOLD,
      },
      update: {},
    });
  }

  isEligibleForNewRides(balance: number, minBalance: number): boolean {
    return balance >= minBalance;
  }

  isBelowWarningThreshold(balance: number, warningThreshold: number): boolean {
    return balance < warningThreshold;
  }

  /**
   * Deducts commission from driver wallet (capped so balance never drops below MIN_WALLET_BALANCE_FLOOR),
   * writes ledger row with optional metadata for full commission due vs applied, idempotent per ride.
   */
  async applyCommissionForCompletedRide(
    tx: Prisma.TransactionClient,
    input: {
      driverId: string;
      rideId: string;
      fareAmount: number;
      paymentMethod: RidePaymentMethod;
      /** Decimal rate, e.g. 0.05 for 5%. From persisted admin commission settings. */
      commissionRateDecimal: number;
      /** Whole or fractional percent for ledger copy, e.g. 5 or 5.5 */
      commissionPercentLabel: number;
    },
  ): Promise<{
    commissionAmount: number;
    alreadyApplied: boolean;
    dispatchEventIds: string[];
  }> {
    const dup = await tx.walletTransaction.findFirst({
      where: { rideId: input.rideId, type: WalletTransactionType.commission },
    });
    if (dup) {
      this.logger.log('wallet.commission_duplicate_skipped', {
        driverId: input.driverId,
        rideId: input.rideId,
        amount: dup.amount,
      });
      return { commissionAmount: dup.amount, alreadyApplied: true, dispatchEventIds: [] };
    }
    const dispatchEventIds: string[] = [];

    const rate = Number.isFinite(input.commissionRateDecimal)
      ? Math.min(1, Math.max(0, input.commissionRateDecimal))
      : DEFAULT_PLATFORM_COMMISSION_RATE;
    const commissionDue = Math.max(0, Math.round(input.fareAmount * rate));

    await this.ensureWalletInTx(tx, input.driverId);

    const walletRow = await tx.driverWallet.findUniqueOrThrow({
      where: { driverId: input.driverId },
    });
    const balanceBefore = walletRow.balance;
    const minB = walletRow.minBalance;
    const warn = walletRow.warningThreshold;

    const roomAboveFloor = Math.max(0, balanceBefore - MIN_WALLET_BALANCE_FLOOR);
    const actualDebit = Math.min(commissionDue, roomAboveFloor);
    const capped = commissionDue > actualDebit;

    if (actualDebit > 0) {
      await tx.driverWallet.update({
        where: { driverId: input.driverId },
        data: { balance: { decrement: actualDebit } },
      });
    }

    const balanceAfter = balanceBefore - actualDebit;

    const pctForCopy = Number.isFinite(input.commissionPercentLabel)
      ? input.commissionPercentLabel
      : Math.round(rate * 1000) / 10;
    const pctStr =
      typeof pctForCopy === 'number' && pctForCopy % 1 !== 0
        ? pctForCopy.toFixed(1).replace(/\.0$/, '')
        : String(Math.round(pctForCopy));
    const baseReason = `Platform commission (${pctStr}%) — rider paid via ${this.riderPaidVia(input.paymentMethod)}`;
    const reason = capped
      ? `${baseReason} — due ${commissionDue} ETB, debited ${actualDebit} ETB (wallet floor ${MIN_WALLET_BALANCE_FLOOR} ETB)`
      : baseReason;

    const metadata: Prisma.InputJsonValue = {
      commissionDue,
      commissionApplied: actualDebit,
      capped,
      fareAmount: input.fareAmount,
      balanceBefore,
      balanceAfter,
    };

    await tx.walletTransaction.create({
      data: {
        driverId: input.driverId,
        type: WalletTransactionType.commission,
        amount: actualDebit,
        reason,
        rideId: input.rideId,
        metadata,
      },
    });

    if (commissionDue > 0 || actualDebit > 0) {
      const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
        driverId: input.driverId,
        type: DriverNotificationType.commission_deducted,
        title: 'Commission recorded',
        body: capped
          ? `Trip commission: ${commissionDue} ETB due; ${actualDebit} ETB debited (wallet floor). New balance: ${balanceAfter} ETB.`
          : `Trip commission: ${actualDebit} ETB debited. New balance: ${balanceAfter} ETB.`,
        data: {
          rideId: input.rideId,
          commissionDue,
          commissionApplied: actualDebit,
          capped,
          balanceAfter,
        },
      });
      dispatchEventIds.push(eventId);
    }

    if (balanceAfter < minB && balanceBefore >= minB) {
      const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
        driverId: input.driverId,
        type: DriverNotificationType.wallet_blocked,
        title: 'Wallet below minimum',
        body: `Your balance (${balanceAfter} ETB) is below the minimum (${minB} ETB) to receive new trip requests. Top up and wait for approval.`,
        data: { balanceAfter, minBalance: minB },
      });
      dispatchEventIds.push(eventId);
    } else if (
      balanceAfter < warn &&
      balanceAfter >= minB &&
      balanceBefore >= warn
    ) {
      const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
        driverId: input.driverId,
        type: DriverNotificationType.low_balance_warning,
        title: 'Low wallet balance',
        body: `Your balance (${balanceAfter} ETB) is below the warning threshold (${warn} ETB). Consider topping up soon.`,
        data: { balanceAfter, warningThreshold: warn },
      });
      dispatchEventIds.push(eventId);
    }

    this.logger.log('wallet.commission_applied', {
      driverId: input.driverId,
      rideId: input.rideId,
      commissionDue,
      commissionApplied: actualDebit,
      capped,
      balanceBefore,
      balanceAfter,
      paymentMethod: input.paymentMethod,
    });
    return { commissionAmount: actualDebit, alreadyApplied: false, dispatchEventIds };
  }

  private riderPaidVia(method: RidePaymentMethod): string {
    if (method === RidePaymentMethod.cash) return 'cash';
    if (method === RidePaymentMethod.bank) return 'bank';
    return 'telebirr';
  }

  private async ensureWalletInTx(tx: Prisma.TransactionClient, driverId: string): Promise<void> {
    await tx.driverWallet.upsert({
      where: { driverId },
      create: {
        driverId,
        balance: 0,
        minBalance: DEFAULT_MIN_BALANCE,
        warningThreshold: DEFAULT_WARNING_THRESHOLD,
      },
      update: {},
    });
  }

  async createTopUpRequest(input: {
    driverId: string;
    amount: number;
    method: TopUpMethod;
    reference: string;
  }): Promise<{ id: string }> {
    if (input.amount <= 0) {
      throw new BadRequestException('invalid_amount');
    }
    await this.ensureWallet(input.driverId);
    const row = await this.prisma.topUpRequest.create({
      data: {
        driverId: input.driverId,
        amount: input.amount,
        method: input.method,
        reference: input.reference.trim(),
        status: TopUpStatus.pending,
      },
    });
    this.logger.log('wallet.top_up_requested', {
      requestId: row.id,
      driverId: input.driverId,
      amount: input.amount,
      method: input.method,
    });
    return { id: row.id };
  }

  async approveTopUpRequest(
    requestId: string,
    reviewedBy: string | undefined,
  ): Promise<{ credited: number; balance: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const req = await tx.topUpRequest.findUnique({ where: { id: requestId } });
      if (!req) {
        throw new NotFoundException('top_up_not_found');
      }
      if (req.status !== TopUpStatus.pending) {
        throw new BadRequestException('top_up_not_pending');
      }
      await this.ensureWalletInTx(tx, req.driverId);
      await tx.driverWallet.update({
        where: { driverId: req.driverId },
        data: { balance: { increment: req.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          driverId: req.driverId,
          type: WalletTransactionType.credit,
          amount: req.amount,
          reason: `Top-up approved (${req.method}) — ref ${req.reference}`,
        },
      });
      await tx.topUpRequest.update({
        where: { id: requestId },
        data: { status: TopUpStatus.approved, reviewedBy: reviewedBy ?? 'admin' },
      });
      const w = await tx.driverWallet.findUniqueOrThrow({ where: { driverId: req.driverId } });

      const { eventId } = await this.notifications.createDriverNotificationTx(tx, {
        driverId: req.driverId,
        type: DriverNotificationType.top_up_approved,
        title: 'Top-up approved',
        body: `ETB ${req.amount} was added to your wallet. Reference: ${req.reference}.`,
        data: { topUpRequestId: requestId, amount: req.amount },
      });

      return { credited: req.amount, balance: w.balance, eventId };
    });
    void this.notifications.flushOutboundDeliveries(result.eventId);
    this.logger.log('wallet.top_up_approved', {
      requestId,
      reviewedBy: reviewedBy ?? 'admin',
      credited: result.credited,
      balance: result.balance,
    });
    return { credited: result.credited, balance: result.balance };
  }

  async rejectTopUpRequest(requestId: string, reviewedBy: string | undefined): Promise<void> {
    const { eventId } = await this.prisma.$transaction(async (tx) => {
      const req = await tx.topUpRequest.findUnique({ where: { id: requestId } });
      if (!req) {
        throw new NotFoundException('top_up_not_found');
      }
      if (req.status !== TopUpStatus.pending) {
        throw new BadRequestException('top_up_not_pending');
      }
      await tx.topUpRequest.update({
        where: { id: requestId },
        data: { status: TopUpStatus.rejected, reviewedBy: reviewedBy ?? 'admin' },
      });
      return this.notifications.createDriverNotificationTx(tx, {
        driverId: req.driverId,
        type: DriverNotificationType.top_up_rejected,
        title: 'Top-up not approved',
        body: `Your top-up request for ETB ${req.amount} (${req.method}, ref ${req.reference}) was rejected. Contact support if you believe this is an error.`,
        data: { topUpRequestId: requestId, amount: req.amount },
      });
    });
    void this.notifications.flushOutboundDeliveries(eventId);
    this.logger.log('wallet.top_up_rejected', {
      requestId,
      reviewedBy: reviewedBy ?? 'admin',
    });
  }
}
