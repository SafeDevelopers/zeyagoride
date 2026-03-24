import { IsEnum, IsString } from 'class-validator';
import { SessionUserRole } from '../enums/session-user-role.enum';

/** Matches mobile `SessionUser`. */
export class SessionUserDto {
  @IsString()
  id!: string;

  @IsString()
  phone!: string;

  @IsString()
  name!: string;

  @IsEnum(SessionUserRole)
  role!: SessionUserRole;
}
