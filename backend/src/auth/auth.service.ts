import { Injectable } from '@nestjs/common';
import { LoginWithPhoneDto } from './dto/login-with-phone.dto';
import { LoginWithPhoneResponseDto } from './dto/login-with-phone-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { SessionUserRole } from '../common/enums/session-user-role.enum';

@Injectable()
export class AuthService {
  /** TODO: integrate SMS / OTP provider */
  loginWithPhone(_dto: LoginWithPhoneDto): LoginWithPhoneResponseDto {
    return { message: 'otp_sent' };
  }

  /** TODO: verify code, issue real JWTs */
  verifyOtp(dto: VerifyOtpDto): VerifyOtpResponseDto {
    const digits = dto.phone.replace(/\D/g, '').slice(-4) || '0000';
    return {
      accessToken: `mock-access-${digits}`,
      refreshToken: `mock-refresh-${digits}`,
      user: {
        id: `user-${digits}`,
        phone: dto.phone,
        name: 'Placeholder User',
        role: SessionUserRole.Rider,
      },
      expiresAt: new Date(Date.now() + 86400e3 * 365).toISOString(),
    };
  }
}
