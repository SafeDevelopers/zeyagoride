import { Type } from 'class-transformer';
import { IsBoolean, IsString, ValidateNested } from 'class-validator';
import { SessionUserDto } from '../../common/dto/session-user.dto';

export class VerifyOtpResponseDto {
  @IsString()
  accessToken!: string;

  @IsString()
  refreshToken!: string;

  @ValidateNested()
  @Type(() => SessionUserDto)
  user!: SessionUserDto;

  /** ISO 8601 */
  @IsString()
  expiresAt!: string;

  @IsBoolean()
  registrationRequired!: boolean;

  @IsString()
  authFlow!: 'login' | 'register';
}
