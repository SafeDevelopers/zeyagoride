import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { RideSummaryDto } from '../../common/dto/ride-summary.dto';
import { GATEWAY_PAYLOAD_KIND, RIDE_EVENT } from '../realtime.constants';

const rideEventTypes = Object.values(RIDE_EVENT) as string[];

/** Outbound envelope: `kind: ride` — matches mobile `applyGatewayPayloadToRideEvents`. */
export class GatewayRidePayloadDto {
  @IsIn([GATEWAY_PAYLOAD_KIND.RIDE])
  kind!: typeof GATEWAY_PAYLOAD_KIND.RIDE;

  @IsString()
  rideId!: string;

  @IsIn(rideEventTypes)
  eventType!: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RideSummaryDto)
  ride?: RideSummaryDto;
}
