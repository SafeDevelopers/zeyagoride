import { IsIn, IsInt, IsString } from 'class-validator';

/** Matches mobile `FareEstimate` (`types/route.ts`). */
export class FareEstimateDto {
  @IsIn(['ETB'])
  currency!: 'ETB';

  @IsInt()
  amount!: number;

  @IsString()
  formatted!: string;

  @IsInt()
  originalFare!: number;

  @IsInt()
  discountAmount!: number;

  @IsInt()
  finalFare!: number;

  @IsString()
  promoCode!: string;
}
