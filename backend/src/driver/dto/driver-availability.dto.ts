import { IsBoolean } from 'class-validator';

export class DriverAvailabilityDto {
  @IsBoolean()
  online!: boolean;
}
