import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SessionUserRole } from '../../common/enums/session-user-role.enum';

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsEnum(SessionUserRole)
  role?: SessionUserRole;
}
