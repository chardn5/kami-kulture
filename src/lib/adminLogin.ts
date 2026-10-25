import { createHash, timingSafeEqual } from 'node:crypto';

export function safeAdminNext(value?: string | null) {
  return value && /^\/admin(?:\/|\?|$)/.test(value) && !/[\\\r\n]/.test(value)
    && !value.startsWith('/admin/sign-in') && !value.startsWith('/admin/sign-out') ? value : '/admin';
}

export function validAdminCredentials(user: string, password: string) {
  const expectedUser = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const expectedPassword = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return !!expectedUser && !!expectedPassword &&
    timingSafeEqual(digest(user), digest(expectedUser)) && timingSafeEqual(digest(password), digest(expectedPassword));
}
