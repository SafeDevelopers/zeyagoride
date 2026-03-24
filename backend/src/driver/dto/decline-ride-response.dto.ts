import { IsBoolean } from 'class-validator';

export class DeclineRideResponseDto {
  @IsBoolean()
  declined!: true;
}
