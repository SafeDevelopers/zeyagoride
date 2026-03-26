import { IsEmail, IsString } from 'class-validator';

export class ProfileFieldsDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  address!: string;
}
