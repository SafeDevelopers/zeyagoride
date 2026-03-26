import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

export type PrepareRidePaymentInput = {
  rideId: string;
  amount: number;
  currency: string;
};

export type PrepareRidePaymentResult = {
  provider: string;
  providerReference: string | null;
  status: PaymentStatus;
};

@Injectable()
export class PaymentProviderService {
  async prepareRidePayment(
    input: PrepareRidePaymentInput,
  ): Promise<PrepareRidePaymentResult> {
    return {
      provider: 'stub',
      providerReference: `stub-${input.rideId}`,
      status: PaymentStatus.unpaid,
    };
  }
}
