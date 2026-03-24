import { IsString } from 'class-validator';

export class DriverIncomingOfferDto {
  @IsString()
  id!: string;

  @IsString()
  pickup!: string;

  @IsString()
  destination!: string;

  @IsString()
  earning!: string;
}
