import type { SessionUser, VerifyOtpResponse } from '../types/api';
import type { AuthStep } from '../types/mobile';

const KEY_ACCESS = 'zeyago_mobile_access_token';
const KEY_REFRESH = 'zeyago_mobile_refresh_token';
const KEY_SESSION = 'zeyago_mobile_session';

/** Normalized payload persisted after `VerifyOtpResponse` (and read on bootstrap). */
export type PersistedSessionSnapshot = {
  user: SessionUser;
  expiresAt: string;
};

/** @deprecated Use `PersistedSessionSnapshot` — kept for external references. */
export type MobileSessionSnapshot = PersistedSessionSnapshot;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(KEY_ACCESS);
}

export function setAccessToken(token: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY_ACCESS, token);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  const v = window.localStorage.getItem(KEY_REFRESH);
  return v === '' || v === null ? null : v;
}

export function setRefreshToken(token: string | null): void {
  if (!canUseStorage()) return;
  if (token === null || token === '') {
    window.localStorage.removeItem(KEY_REFRESH);
    return;
  }
  window.localStorage.setItem(KEY_REFRESH, token);
}

type LegacySnapshotV1 = {
  phoneDigits: string;
  displayName: string;
};

function isLegacySnapshot(o: unknown): o is LegacySnapshotV1 {
  return (
    typeof o === 'object' &&
    o !== null &&
    'phoneDigits' in o &&
    'displayName' in o &&
    !('user' in o)
  );
}

function migrateLegacyToPersisted(legacy: LegacySnapshotV1): PersistedSessionSnapshot {
  const d = legacy.phoneDigits.replace(/\D/g, '');
  const local = d.length >= 9 ? d.slice(-9) : '911223344';
  return {
    user: {
      id: 'legacy-user',
      phone: `+251${local}`,
      name: legacy.displayName,
      role: 'rider',
    },
    expiresAt: new Date(Date.now() + 86400e3 * 365).toISOString(),
  };
}

function normalizeStoredSession(parsed: unknown): PersistedSessionSnapshot | null {
  if (!parsed || typeof parsed !== 'object') return null;
  if (isLegacySnapshot(parsed)) {
    return migrateLegacyToPersisted(parsed);
  }
  const o = parsed as PersistedSessionSnapshot;
  if (
    o.user &&
    typeof o.user === 'object' &&
    typeof o.user.id === 'string' &&
    typeof o.user.phone === 'string' &&
    typeof o.user.name === 'string' &&
    typeof o.user.role === 'string' &&
    typeof o.expiresAt === 'string'
  ) {
    return o;
  }
  return null;
}

export function getSessionSnapshot(): PersistedSessionSnapshot | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(KEY_SESSION);
  if (!raw) return null;
  try {
    return normalizeStoredSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function setSessionSnapshot(snapshot: PersistedSessionSnapshot): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY_SESSION, JSON.stringify(snapshot));
}

export function getExpiresAt(): string | null {
  return getSessionSnapshot()?.expiresAt ?? null;
}

export function getStoredUser(): SessionUser | null {
  return getSessionSnapshot()?.user ?? null;
}

export function clearMobileSession(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(KEY_ACCESS);
  window.localStorage.removeItem(KEY_REFRESH);
  window.localStorage.removeItem(KEY_SESSION);
}

export function hasPersistedSession(): boolean {
  const token = getAccessToken();
  const snap = getSessionSnapshot();
  if (!token || !snap?.user) return false;
  const exp = Date.parse(snap.expiresAt);
  if (!Number.isNaN(exp) && exp <= Date.now()) return false;
  return true;
}

function phoneDigitsFromUserPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('251')) return d.slice(3);
  if (d.length >= 9) return d.slice(-9);
  return d;
}

function formatPhoneForDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '');
  const local =
    d.length >= 12 && d.startsWith('251') ? d.slice(3) : d.length >= 9 ? d.slice(-9) : '';
  if (local.length < 9) return '+251 911 223344';
  return `+251 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

const DEFAULT_NAME = 'Felix M.';
const DEFAULT_PHONE_DISPLAY = '+251 911 223344';

export function getInitialAuthStep(): AuthStep {
  return hasPersistedSession() ? 'home' : 'welcome';
}

export function getInitialPhoneDigits(): string {
  const u = getStoredUser();
  return u ? phoneDigitsFromUserPhone(u.phone) : '';
}

export function getInitialUserName(): string {
  return getStoredUser()?.name ?? DEFAULT_NAME;
}

export function getInitialUserPhoneDisplay(): string {
  const u = getStoredUser();
  if (u?.phone) return formatPhoneForDisplay(u.phone);
  return DEFAULT_PHONE_DISPLAY;
}

export function getInitialEditName(): string {
  return getInitialUserName();
}

/** Persist tokens + normalized user + expiry from verify response. */
export function persistSessionAfterVerify(verify: VerifyOtpResponse): void {
  setAccessToken(verify.accessToken);
  setRefreshToken(verify.refreshToken);
  setSessionSnapshot({
    user: verify.user,
    expiresAt: verify.expiresAt,
  });
}
