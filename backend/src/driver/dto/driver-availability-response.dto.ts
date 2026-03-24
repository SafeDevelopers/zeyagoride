import { IsBoolean } from 'class-validator';

export class DriverAvailabilityResponseDto {
  @IsBoolean()
  online!: boolean;
}
