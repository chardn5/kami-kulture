import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

function sessionSecret() {
  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  return user && pass ? `${user}:${pass}` : '';
}

function sign(payload: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createAdminSessionToken(now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  if (!expected) return false;

  const actualBuffer = Buffer.from(parts[2]);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
