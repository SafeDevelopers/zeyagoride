import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IsBoolean, IsOptional } from 'class-validator';
import { RideSummaryDto } from '../../common/dto/ride-summary.dto';

export class CancelRideResponseDto {
  @IsBoolean()
  cancelled!: true;

  @IsOptional()
  @ValidateNested()
  @Type(() => RideSummaryDto)
  ride?: RideSummaryDto;
}
