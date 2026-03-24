import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { RideSummaryDto } from '../../common/dto/ride-summary.dto';

export class RequestRideResponseDto {
  @ValidateNested()
  @Type(() => RideSummaryDto)
  ride!: RideSummaryDto;
}
