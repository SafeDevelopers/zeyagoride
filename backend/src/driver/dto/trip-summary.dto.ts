import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { RideSummaryDto } from '../../common/dto/ride-summary.dto';

export class TripSummaryDto {
  @IsString()
  tripId!: string;

  @ValidateNested()
  @Type(() => RideSummaryDto)
  ride!: RideSummaryDto;
}
