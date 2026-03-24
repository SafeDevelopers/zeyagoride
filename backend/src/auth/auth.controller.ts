import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginWithPhoneDto } from './dto/login-with-phone.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login-with-phone')
  loginWithPhone(@Body() body: LoginWithPhoneDto) {
    return this.authService.loginWithPhone(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }
}
