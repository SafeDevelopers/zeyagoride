import { Body, Controller, Get, Header, Param, Put, Query, UseGuards } from '@nestjs/common';
import { WalletTransactionType } from '@prisma/client';
import { AppStateService } from '../app-state/app-state.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { SessionUserDto } from '../common/dto/session-user.dto';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

/**
 * Read/write admin surface backed by the same persisted state as rider/driver flows.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SessionUserRole.Admin)
export class AdminController {
  constructor(private readonly appState: AppStateService) {}

  @Get('overview')
  overview() {
    return this.appState.getAdminOverview();
  }

  @Get('settings')
  settings() {
    return this.appState.getAppSettings();
  }

  @Get('drivers')
  drivers() {
    return this.appState.listAdminDrivers();
  }

  @Get('riders')
  riders() {
    return this.appState.listAdminRiders();
  }

  @Get('pricing')
  pricing() {
    return this.appState.getPricingSettings();
  }

  @Get('promos')
  promos() {
    return this.appState.getPromoSettings();
  }

  @Put('settings')
  updateSettings(
    @CurrentUser() user: SessionUserDto,
    @Body() body: { requireRideSafetyPin?: boolean; demoAutoTripProgression?: boolean },
  ) {
    return this.appState.updateAppSettings(body, user);
  }

  @Put('pricing')
  updatePricing(
    @CurrentUser() user: SessionUserDto,
    @Body()
    body: {
      baseFare?: number;
      perKmRate?: number;
      perMinuteRate?: number;
      minimumFare?: number;
      cancellationFee?: number;
    },
  ) {
    return this.appState.updatePricingSettings(body, user);
  }

  @Put('promos')
  updatePromos(
    @CurrentUser() user: SessionUserDto,
    @Body()
    body: {
      enabled?: boolean;
      code?: string;
      discountType?: 'fixed' | 'percent';
      discountAmount?: number;
      active?: boolean;
    },
  ) {
    return this.appState.updatePromoSettings(body, user);
  }

  /** Persist platform commission (percent of completed trip fare). */
  @Put('commission')
  updateCommission(
    @CurrentUser() user: SessionUserDto,
    @Body()
    body: {
      commissionType?: 'percent';
      commissionRate?: number;
    },
  ) {
    return this.appState.updateCommissionSettings(body, user);
  }

  @Put('drivers/:driverId/verification')
  updateDriverVerification(
    @CurrentUser() user: SessionUserDto,
    @Param('driverId') driverId: string,
    @Body() body: { verificationStatus?: string },
  ) {
    return this.appState.updateAdminDriverVerification(driverId, body, user);
  }

  @Put('drivers/:driverId/vehicle')
  updateDriverVehicleApproval(
    @CurrentUser() user: SessionUserDto,
    @Param('driverId') driverId: string,
    @Body() body: { vehicleStatus?: string; rejectionReason?: string },
  ) {
    return this.appState.updateAdminDriverVehicle(driverId, body, user);
  }

  @Get('wallet/transactions')
  listWalletTransactions(
    @Query('driverId') driverId?: string,
    @Query('type') type?: WalletTransactionType,
    @Query('limit') limit?: string,
  ) {
    return this.appState.listAdminWalletTransactions({
      driverId,
      type,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get('wallet/transactions/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="wallet-transactions.csv"')
  async exportWalletTransactionsCsv(
    @Query('driverId') driverId?: string,
    @Query('type') type?: WalletTransactionType,
  ) {
    const data = await this.appState.listAdminWalletTransactions({
      driverId,
      type,
      limit: 2000,
    });
    return this.appState.buildWalletTransactionsCsv(data.transactions);
  }

  @Get('wallet/top-up-requests')
  listTopUpRequests() {
    return this.appState.listAdminTopUpRequests();
  }

  @Get('wallet/notifications')
  listDriverNotifications(@Query('limit') limit?: string) {
    return this.appState.listAdminDriverNotifications(
      limit != null ? Number(limit) : undefined,
    );
  }

  @Put('wallet/top-up-requests/:requestId/approve')
  approveTopUp(@CurrentUser() user: SessionUserDto, @Param('requestId') requestId: string) {
    return this.appState.approveAdminTopUpRequest(requestId, user);
  }

  @Put('wallet/top-up-requests/:requestId/reject')
  rejectTopUp(@CurrentUser() user: SessionUserDto, @Param('requestId') requestId: string) {
    return this.appState.rejectAdminTopUpRequest(requestId, user);
  }
}
