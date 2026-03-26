import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { SessionUserRole } from '../enums/session-user-role.enum';

/** Matches mobile `SessionUser`. */
export class SessionUserDto {
  @IsString()
  id!: string;

  @IsString()
  phone!: string;

  @IsString()
  name!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(SessionUserRole)
  role!: SessionUserRole;
}
