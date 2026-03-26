import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SessionUserRole } from '../../common/enums/session-user-role.enum';

export class LoginWithPhoneDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEnum(SessionUserRole)
  role?: SessionUserRole;
}
