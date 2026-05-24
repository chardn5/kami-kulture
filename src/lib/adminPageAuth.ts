import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';

function decodeBasicAuth(h: string) {
  if (!h?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(h.split(' ')[1] || '', 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;
    return { user: decoded.slice(0, separator), pass: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export async function requireAdminPageAccess(next = '/admin/orders') {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
  const adminOk = cookieStore.get('admin_ok')?.value === '1';
  const signedSessionOk = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  const creds = decodeBasicAuth(hdrs.get('authorization') ?? '');
  const okAuth = !!user && !!pass && !!creds && creds.user === user && creds.pass === pass;

  if (!signedSessionOk && !(adminOk && okAuth)) {
    redirect(`/admin/sign-in?next=${encodeURIComponent(next)}`);
  }
}
