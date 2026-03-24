import { IsOptional, IsString } from 'class-validator';

export class DeclineRideDto {
  @IsString()
  requestId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
