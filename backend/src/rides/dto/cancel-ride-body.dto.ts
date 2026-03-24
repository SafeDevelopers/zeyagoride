import { IsOptional, IsString } from 'class-validator';

/** Body for DELETE /rides/:rideId — mobile sends `{ reason?: string }`. */
export class CancelRideBodyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
