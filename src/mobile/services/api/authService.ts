import type {
  LoginWithPhoneRequest,
  LoginWithPhoneResponse,
  SessionUser,
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
  loginWithPhone(phone: string): Promise<LoginWithPhoneResponse>;
  verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse>;
};

function mockVerifyUser(phoneDigits: string): SessionUser {
  const d = phoneDigits.replace(/\s/g, '').replace(/\D/g, '');
  const local = d.length >= 9 ? d.slice(-9) : '911223344';
  return {
    id: `mock-user-${local.slice(-4)}`,
    phone: `+251${local}`,
    name: 'Felix M.',
    role: 'rider',
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

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
    await delay(1500);
    if (!code || code.replace(/\s/g, '').length < 4) {
      throw new Error('invalid_code');
    }
    const d = phone.replace(/\s/g, '');
    const suffix = d.replace(/\D/g, '').slice(-4);
    return {
      accessToken: `mock-access-${suffix}`,
      refreshToken: `mock-refresh-${suffix}`,
      user: mockVerifyUser(phone),
      /** Long-lived so mock mode matches prior “no surprise expiry” demo behavior. */
      expiresAt: new Date(Date.now() + 86400e3 * 365 * 10).toISOString(),
    };
  },
};

function createAuthApiService(): AuthService {
  return {
    async loginWithPhone(phone: string): Promise<LoginWithPhoneResponse> {
      const body: LoginWithPhoneRequest = { phone };
      const raw = await request<unknown>('POST', endpoints.auth.loginWithPhone(), body);
      return adaptLoginWithPhoneResponse(raw);
    },

    async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
      const body: VerifyOtpRequest = { phone, code };
      const raw = await request<unknown>('POST', endpoints.auth.verifyOtp(), body);
      return adaptVerifyOtpResponse(raw);
    },
  };
}

function createAuthApiServiceWithDevFallback(): AuthService {
  const api = createAuthApiService();
  return {
    async loginWithPhone(phone: string): Promise<LoginWithPhoneResponse> {
      try {
        return await api.loginWithPhone(phone);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.loginWithPhone(phone);
        throw e;
      }
    },
    async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
      try {
        return await api.verifyOtp(phone, code);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockAuthService.verifyOtp(phone, code);
        throw e;
      }
    },
  };
}

export const authService: AuthService = USE_MOCK_API ? mockAuthService : createAuthApiServiceWithDevFallback();
