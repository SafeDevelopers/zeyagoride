import { IsIn, IsOptional, IsString } from 'class-validator';
import { DRIVER_REQUEST_EVENT, GATEWAY_PAYLOAD_KIND } from '../realtime.constants';

const driverEventTypes = Object.values(DRIVER_REQUEST_EVENT) as string[];

/** Outbound envelope: `kind: driver_request`. */
export class GatewayDriverRequestPayloadDto {
  @IsIn([GATEWAY_PAYLOAD_KIND.DRIVER_REQUEST])
  kind!: typeof GATEWAY_PAYLOAD_KIND.DRIVER_REQUEST;

  @IsIn(driverEventTypes)
  eventType!: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  pickup?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  earning?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
