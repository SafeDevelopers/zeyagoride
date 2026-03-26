import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUserDto } from '../common/dto/session-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { LoginWithPhoneDto } from './dto/login-with-phone.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RegisterRiderDto } from './dto/register-rider.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: SessionUserDto & { sessionId?: string },
    @Body() body: RefreshTokenDto,
  ) {
    return this.authService.logout({
      sessionId: user.sessionId,
      refreshToken: body.refreshToken,
    });
  }

  @Post('register/rider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SessionUserRole.Rider)
  registerRider(
    @CurrentUser() user: SessionUserDto,
    @Body() body: RegisterRiderDto,
  ) {
    return this.authService.registerRider(user.id, body);
  }

  @Post('register/driver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SessionUserRole.Driver)
  registerDriver(
    @CurrentUser() user: SessionUserDto,
    @Body() body: RegisterDriverDto,
  ) {
    return this.authService.registerDriver(user.id, body);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser() user: SessionUserDto) {
    return this.authService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: SessionUserDto, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, body);
  }
}
