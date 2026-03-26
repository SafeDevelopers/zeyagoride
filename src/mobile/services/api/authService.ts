import type {
  LoginWithPhoneRequest,
  LoginWithPhoneResponse,
  RegisterDriverRequest,
  RegisterRiderRequest,
  SessionUser,
  SessionUserRole,
  UpdateProfileRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../../types/api';
import { USE_MOCK_API } from '../../config/env';
import { adaptLoginWithPhoneResponse, adaptVerifyOtpResponse } from './adapters';
import { shouldDevFallbackToMock } from './devFallback';
import { request } from './client';
import { delay } from './delay';
import { endpoints } from './endpoints';

export type AuthService = {
  loginWithPhone(phone: string, role?: SessionUserRole): Promise<LoginWithPhoneResponse>;
  verifyOtp(phone: string, code: string, role?: SessionUserRole): Promise<VerifyOtpResponse>;
  registerRider(payload: RegisterRiderRequest): Promise<{ user: SessionUser }>;
  registerDriver(payload: RegisterDriverRequest): Promise<{ user: SessionUser }>;
  getProfile(): Promise<{ user: SessionUser }>;
  updateProfile(payload: UpdateProfileRequest): Promise<{ user: SessionUser }>;
};

function mockVerifyUser(phoneDigits: string, role: SessionUserRole = 'rider'): SessionUser {
  const d = phoneDigits.replace(/\s/g, '').replace(/\D/g, '');
  const local = d.length >= 9 ? d.slice(-9) : '911223344';
  return {
    id: `mock-user-${local.slice(-4)}`,
    phone: `+251${local}`,
    name: role === 'driver' ? 'Felix Driver' : 'Felix Rider',
    firstName: 'Felix',
    lastName: role === 'driver' ? 'Driver' : 'Rider',
    email: role === 'driver' ? 'driver@example.com' : 'rider@example.com',
    address: 'Bole, Addis Ababa',
    role,
  };
}

/**
 * In-app mock — same DTO shapes as real API when `USE_MOCK_API` is true.
 */
export const mockAuthService: AuthService = {
  async loginWithPhone(phone: string): Promise<LoginWithPhoneResponse> {
    await delay(50);
    if (!phone || phone.replace(/\s/g, '').length < 9) {
      throw new Error('invalid_phone');
    }
    return { message: 'otp_sent' };
  },

  async verifyOtp(phone: string, code: string, role?: SessionUserRole): Promise<VerifyOtpResponse> {
    await delay(1500);
    if (!code || code.replace(/\s/g, '').length < 4) {
      throw new Error('invalid_code');
    }
    const d = phone.replace(/\s/g, '');
    const suffix = d.replace(/\D/g, '').slice(-4);
    return {
      accessToken: `mock-access-${suffix}`,
      refreshToken: `mock-refresh-${suffix}`,
      user: mockVerifyUser(phone, role ?? 'rider'),
      /** Long-lived so mock mode matches prior “no surprise expiry” demo behavior. */
      expiresAt: new Date(Date.now() + 86400e3 * 365 * 10).toISOString(),
      registrationRequired: false,
      authFlow: 'login',
    };
  },

  async registerRider(payload: RegisterRiderRequest): Promise<{ user: SessionUser }> {
    await delay(200);
    return {
      user: {
        id: 'mock-rider',
        phone: '+251911223344',
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        address: payload.address,
        role: 'rider',
      },
    };
  },

  async registerDriver(payload: RegisterDriverRequest): Promise<{ user: SessionUser }> {
    await delay(200);
    return {
      user: {
        id: 'mock-driver',
        phone: '+251911223344',
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        address: payload.address,
        role: 'driver',
      },
    };
  },

  async getProfile(): Promise<{ user: SessionUser }> {
    await delay(120);
    return { user: mockVerifyUser('+251911223344') };
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<{ user: SessionUser }> {
    await delay(180);
    return {
      user: {
        ...mockVerifyUser('+251911223344'),
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        address: payload.address,
      },
    };
  },
};

function createAuthApiService(): AuthService {
  return {
    async loginWithPhone(phone: string, role?: SessionUserRole): Promise<LoginWithPhoneResponse> {
      const body: LoginWithPhoneRequest & { role?: SessionUserRole } = { phone, role };
      const raw = await request<unknown>('POST', endpoints.auth.loginWithPhone(), body);
      return adaptLoginWithPhoneResponse(raw);
    },

    async verifyOtp(phone: string, code: string, role?: SessionUserRole): Promise<VerifyOtpResponse> {
      const body: VerifyOtpRequest = { phone, code, role };
      const raw = await request<unknown>('POST', endpoints.auth.verifyOtp(), body);
      return adaptVerifyOtpResponse(raw);
    },

    async registerRider(payload: RegisterRiderRequest): Promise<{ user: SessionUser }> {
      return request<{ user: SessionUser }>('POST', endpoints.auth.registerRider(), payload);
    },

    async registerDriver(payload: RegisterDriverRequest): Promise<{ user: SessionUser }> {
      return request<{ user: SessionUser }>('POST', endpoints.auth.registerDriver(), payload);
    },

    async getProfile(): Promise<{ user: SessionUser }> {
      return request<{ user: SessionUser }>('GET', endpoints.auth.profile());
    },

    async updateProfile(payload: UpdateProfileRequest): Promise<{ user: SessionUser }> {
      return request<{ user: SessionUser }>('PUT', endpoints.auth.profile(), payload);
    },
  };
}

function createAuthApiServiceWithDevFallback(): AuthService {
  const api = createAuthApiService();
  return {
    async loginWithPhone(phone: string, role?: SessionUserRole): Promise<LoginWithPhoneResponse> {
      try {
        return await api.loginWithPhone(phone, role);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.loginWithPhone(phone);
        throw e;
      }
    },
    async verifyOtp(phone: string, code: string, role?: SessionUserRole): Promise<VerifyOtpResponse> {
      try {
        return await api.verifyOtp(phone, code, role);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.verifyOtp(phone, code);
        throw e;
      }
    },
    async registerRider(payload: RegisterRiderRequest): Promise<{ user: SessionUser }> {
      try {
        return await api.registerRider(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.registerRider(payload);
        throw e;
      }
    },
    async registerDriver(payload: RegisterDriverRequest): Promise<{ user: SessionUser }> {
      try {
        return await api.registerDriver(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.registerDriver(payload);
        throw e;
      }
    },
    async getProfile(): Promise<{ user: SessionUser }> {
      try {
        return await api.getProfile();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.getProfile();
        throw e;
      }
    },
    async updateProfile(payload: UpdateProfileRequest): Promise<{ user: SessionUser }> {
      try {
        return await api.updateProfile(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.updateProfile(payload);
        throw e;
      }
    },
  };
}

export const authService: AuthService = USE_MOCK_API ? mockAuthService : createAuthApiServiceWithDevFallback();
