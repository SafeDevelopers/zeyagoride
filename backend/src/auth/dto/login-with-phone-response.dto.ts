import { IsString } from 'class-validator';

export class LoginWithPhoneResponseDto {
  @IsString()
  message!: string;
}
