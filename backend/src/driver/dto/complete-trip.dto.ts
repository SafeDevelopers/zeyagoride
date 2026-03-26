import { IsEnum, IsOptional } from 'class-validator';
import { RidePaymentMethod } from '@prisma/client';

export class CompleteTripDto {
  @IsOptional()
  @IsEnum(RidePaymentMethod)
  paymentMethod?: RidePaymentMethod;
}
