import { IsString } from 'class-validator';

export class AcceptRideDto {
  @IsString()
  requestId!: string;
}
