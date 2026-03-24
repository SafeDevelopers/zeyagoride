import { IsString } from 'class-validator';

export class LoginWithPhoneDto {
  @IsString()
  phone!: string;
}
