import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { TripSummaryDto } from './trip-summary.dto';

export class GetTripResponseDto {
  @ValidateNested()
  @Type(() => TripSummaryDto)
  trip!: TripSummaryDto;
}
