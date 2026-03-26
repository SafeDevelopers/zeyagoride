import { createHash, createHmac, randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { VehicleApprovalStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginWithPhoneDto } from './dto/login-with-phone.dto';
import { LoginWithPhoneResponseDto } from './dto/login-with-phone-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { SessionUserRole } from '../common/enums/session-user-role.enum';
import { StructuredLogger } from '../common/logging/structured-logger';
import type { SessionUserDto } from '../common/dto/session-user.dto';
import { RegisterRiderDto } from './dto/register-rider.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type AccessTokenClaims = {
  sub: string;
  role: SessionUserRole;
  phone: string;
  name: string;
  sessionId: string;
  type: 'access';
  iat: number;
  exp: number;
};

function base64urlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, 'base64').toString('utf8');
}

@Injectable()
export class AuthService {
  private readonly logger = new StructuredLogger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  loginWithPhone(dto: LoginWithPhoneDto): LoginWithPhoneResponseDto {
    const phone = this.normalizePhone(dto.phone);
    this.logger.log('auth.otp_requested', {
      phone,
      requestedRole: dto.role ?? null,
      mode: this.allowTestOtp() ? 'test_otp' : 'provider_unconfigured',
    });
    if (!this.allowTestOtp()) {
      throw new UnauthorizedException('otp_provider_not_configured');
    }
    return { message: 'otp_sent' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const phone = this.normalizePhone(dto.phone);
    this.assertOtpCode(dto.code);
    const role = await this.resolveRole(phone, dto.role);
    const user = await this.findOrCreateSessionUser(phone, role);
    const session = await this.issueSession(user);
    const registrationRequired = !(await this.isRegistrationCompleted(user.id));

    this.logger.log('auth.session_issued', {
      userId: user.id,
      role: user.role,
      sessionId: session.sessionId,
      accessExpiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
      registrationRequired,
    });

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user,
      expiresAt: session.expiresAt,
      registrationRequired,
      authFlow: registrationRequired ? 'register' : 'login',
    };
  }

  async refresh(refreshToken: string): Promise<VerifyOtpResponseDto> {
    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: hash,
        revokedAt: null,
      },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('refresh_token_invalid');
    }

    const user = this.toSessionUser(session.user);
    const next = await this.rotateSession(user, session.id);
    this.logger.log('auth.session_refreshed', {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
      accessExpiresAt: next.expiresAt,
      refreshExpiresAt: next.refreshExpiresAt,
    });
    return {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      user,
      expiresAt: next.expiresAt,
      registrationRequired: !(await this.isRegistrationCompleted(user.id)),
      authFlow: (await this.isRegistrationCompleted(user.id)) ? 'login' : 'register',
    };
  }

  async registerRider(userId: string, dto: RegisterRiderDto): Promise<{ user: SessionUserDto }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== SessionUserRole.Rider) {
      throw new ForbiddenException('role_mismatch');
    }
    const profile = this.normalizeProfileFields(dto);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        address: profile.address,
        phone: user.phone,
        name: this.composeName(profile.firstName, profile.lastName),
        registrationCompleted: this.isProfileComplete({
          ...profile,
          phone: user.phone,
        }),
      },
    });
    return {
      user: this.toSessionUser(updated),
    };
  }

  async registerDriver(userId: string, dto: RegisterDriverDto): Promise<{
    user: SessionUserDto;
    vehicleStatus: VehicleApprovalStatus;
    verificationStatus: string;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== SessionUserRole.Driver) {
      throw new ForbiddenException('role_mismatch');
    }
    const profile = this.normalizeProfileFields(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          address: profile.address,
          phone: user.phone,
          name: this.composeName(profile.firstName, profile.lastName),
          registrationCompleted: this.isProfileComplete({
            ...profile,
            phone: user.phone,
          }),
        },
      });
      await tx.driver.upsert({
        where: { id: userId },
        create: {
          id: userId,
          online: false,
          isVerified: false,
          verificationStatus: 'pending',
        },
        update: {
          online: false,
          isVerified: false,
          verificationStatus: 'pending',
        },
      });
      const vehicle = await tx.driverVehicle.upsert({
        where: { driverId: userId },
        create: {
          driverId: userId,
          make: dto.make.trim(),
          model: dto.model.trim(),
          color: dto.color.trim(),
          capacity: dto.capacity,
          tagNumber: dto.tagNumber.trim(),
          insuranceExpiry: dto.insuranceExpiry?.trim() || null,
          status: VehicleApprovalStatus.pending,
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
        },
        update: {
          make: dto.make.trim(),
          model: dto.model.trim(),
          color: dto.color.trim(),
          capacity: dto.capacity,
          tagNumber: dto.tagNumber.trim(),
          insuranceExpiry: dto.insuranceExpiry?.trim() || null,
          status: VehicleApprovalStatus.pending,
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      });
      return { user: nextUser, vehicle };
    });

    return {
      user: this.toSessionUser(updated.user),
      vehicleStatus: updated.vehicle.status,
      verificationStatus: 'pending',
    };
  }

  async logout(input: { sessionId?: string; refreshToken?: string }): Promise<{ loggedOut: true }> {
    const where =
      input.sessionId != null
        ? { id: input.sessionId }
        : input.refreshToken
          ? { refreshTokenHash: this.hashRefreshToken(input.refreshToken) }
          : null;
    if (!where) {
      throw new UnauthorizedException('logout_session_missing');
    }
    await this.prisma.authSession.updateMany({
      where,
      data: {
        revokedAt: new Date(),
      },
    });
    return { loggedOut: true };
  }

  async getProfile(userId: string): Promise<{ user: SessionUserDto }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { user: this.toSessionUser(user) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<{ user: SessionUserDto }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const profile = this.normalizeProfileFields(dto);
    const hasVehicle =
      user.role === SessionUserRole.Driver
        ? Boolean(await this.prisma.driverVehicle.findUnique({ where: { driverId: userId } }))
        : true;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        address: profile.address,
        phone: user.phone,
        name: this.composeName(profile.firstName, profile.lastName),
        registrationCompleted:
          user.registrationCompleted ||
          (this.isProfileComplete({ ...profile, phone: user.phone }) && hasVehicle),
      },
    });
    return { user: this.toSessionUser(updated) };
  }

  async authenticateAccessToken(
    token: string,
  ): Promise<SessionUserDto & { sessionId?: string }> {
    const claims = this.verifyAccessToken(token);
    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('session_expired');
    }
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      id: claims.sub,
      phone: claims.phone,
      name: claims.name,
      firstName: '',
      lastName: '',
      email: '',
      address: '',
      role: claims.role,
      sessionId: claims.sessionId,
    };
  }

  verifySocketToken(token: string): AccessTokenClaims {
    return this.verifyAccessToken(token);
  }

  private allowTestOtp(): boolean {
    return (
      this.config.get<string>('AUTH_ALLOW_TEST_OTP', 'false').trim().toLowerCase() === 'true'
    );
  }

  private assertOtpCode(code: string): void {
    if (!this.allowTestOtp()) {
      throw new UnauthorizedException('otp_provider_not_configured');
    }
    const expected = this.config.get<string>('AUTH_TEST_OTP_CODE', '').trim();
    if (!expected || code.trim() !== expected) {
      throw new UnauthorizedException('otp_invalid');
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      throw new UnauthorizedException('phone_invalid');
    }
    if (digits.startsWith('251') && digits.length >= 12) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 10) {
      return `+251${digits.slice(1)}`;
    }
    if (digits.length === 9) {
      return `+251${digits}`;
    }
    return `+${digits}`;
  }

  private async resolveRole(
    phone: string,
    requestedRole?: SessionUserRole,
  ): Promise<SessionUserRole> {
    const normalized = phone.replace(/\D/g, '');
    const adminPhones = new Set(
      (this.config.get<string>('ADMIN_PHONE_NUMBERS', '') ?? '')
        .split(',')
        .map((value) => value.replace(/\D/g, '').trim())
        .filter(Boolean),
    );

    if (adminPhones.has(normalized)) {
      return SessionUserRole.Admin;
    }

    const existing = await this.findUserByPhoneDigits(normalized);
    if (existing?.role === SessionUserRole.Driver) {
      return SessionUserRole.Driver;
    }
    if (existing?.role === SessionUserRole.Admin) {
      return SessionUserRole.Admin;
    }

    if (requestedRole) {
      return requestedRole;
    }

    return existing?.role === SessionUserRole.Driver ? SessionUserRole.Driver : SessionUserRole.Rider;
  }

  private async findOrCreateSessionUser(
    phone: string,
    role: SessionUserRole,
  ): Promise<SessionUserDto> {
    const existing = await this.findUserByPhoneDigits(phone.replace(/\D/g, ''), role);
    if (existing) {
      return this.toSessionUser(existing);
    }

    const userId = `${role}-${phone.replace(/\D/g, '').slice(-10) || randomBytes(6).toString('hex')}`;
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        phone,
        name:
          role === SessionUserRole.Admin
            ? 'Admin User'
            : role === SessionUserRole.Driver
              ? 'Driver'
              : 'Rider',
        firstName: null,
        lastName: null,
        email: null,
        address: null,
        role,
        registrationCompleted: role === SessionUserRole.Admin,
      },
    });

    if (role === SessionUserRole.Driver) {
      await this.prisma.driver.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          online: false,
          isVerified: false,
          verificationStatus: 'pending',
        },
        update: {},
      });
    }

    return this.toSessionUser(user);
  }

  private toSessionUser(user: {
    id: string;
    phone: string | null;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    address?: string | null;
    role: string;
  }): SessionUserDto {
    return {
      id: user.id,
      phone: user.phone ?? '',
      name: user.name ?? this.composeName(user.firstName ?? '', user.lastName ?? ''),
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      address: user.address ?? '',
      role: user.role as SessionUserRole,
    };
  }

  private async issueSession(user: SessionUserDto) {
    const sessionId = randomBytes(18).toString('hex');
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + this.refreshTokenTtlSeconds() * 1000,
    );

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        role: user.role,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    const accessExpiresAt = new Date(Date.now() + this.accessTokenTtlSeconds() * 1000);
    return {
      sessionId,
      refreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      accessToken: this.signAccessToken({
        sub: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
        sessionId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(accessExpiresAt.getTime() / 1000),
      }),
      expiresAt: accessExpiresAt.toISOString(),
    };
  }

  private async rotateSession(user: SessionUserDto, sessionId: string) {
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + this.refreshTokenTtlSeconds() * 1000,
    );
    const accessExpiresAt = new Date(Date.now() + this.accessTokenTtlSeconds() * 1000);

    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
        revokedAt: null,
        lastUsedAt: new Date(),
      },
    });

    return {
      sessionId,
      refreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      accessToken: this.signAccessToken({
        sub: user.id,
        role: user.role,
        phone: user.phone,
        name: user.name,
        sessionId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(accessExpiresAt.getTime() / 1000),
      }),
      expiresAt: accessExpiresAt.toISOString(),
    };
  }

  private signAccessToken(payload: AccessTokenClaims): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(unsigned)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    return `${unsigned}.${signature}`;
  }

  private verifyAccessToken(token: string): AccessTokenClaims {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('token_malformed');
    }
    const unsigned = `${header}.${payload}`;
    const expected = createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(unsigned)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    if (expected !== signature) {
      throw new UnauthorizedException('token_invalid');
    }
    let claims: AccessTokenClaims;
    try {
      claims = JSON.parse(base64urlDecode(payload)) as AccessTokenClaims;
    } catch {
      throw new UnauthorizedException('token_invalid');
    }
    if (claims.type !== 'access' || claims.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('token_expired');
    }
    return claims;
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private accessTokenTtlSeconds(): number {
    return Number(this.config.get<string>('ACCESS_TOKEN_TTL_SECONDS', '900'));
  }

  private refreshTokenTtlSeconds(): number {
    return Number(this.config.get<string>('REFRESH_TOKEN_TTL_SECONDS', '2592000'));
  }

  private async findUserByPhoneDigits(
    digits: string,
    role?: SessionUserRole,
  ) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return (
      users.find((candidate) => candidate.phone?.replace(/\D/g, '') === digits) ?? null
    );
  }

  private async isRegistrationCompleted(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { registrationCompleted: true },
    });
    return user?.registrationCompleted ?? false;
  }

  private composeName(firstName: string, lastName: string): string {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    return name || 'User';
  }

  private normalizeProfileFields(input: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
  }) {
    return {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      address: input.address.trim(),
    };
  }

  private isProfileComplete(input: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    phone: string | null | undefined;
  }): boolean {
    return Boolean(
      input.firstName &&
        input.lastName &&
        input.email &&
        input.address &&
        input.phone?.trim(),
    );
  }
}
