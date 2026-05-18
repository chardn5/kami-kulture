// src/app/admin/layout.tsx
import { headers, cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';

function decodeBasicAuth(h: string) {
  if (!h?.startsWith('Basic ')) return null;
  try {
    const [u, p] = Buffer.from(h.split(' ')[1] || '', 'base64').toString('utf8').split(':');
    return { user: u, pass: p };
  } catch { return null; }
}

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
  const auth = hdrs.get('authorization') ?? '';
  const adminOk = cookieStore.get('admin_ok')?.value === '1';
  const signedSessionOk = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  const USER = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const PASS = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  const creds = decodeBasicAuth(auth);
  const okAuth = !!USER && !!PASS && !!creds && creds.user === USER && creds.pass === PASS;

  if (!signedSessionOk && !(okAuth && adminOk)) {
    return (
      <section style={{ maxWidth: 720, margin: '6rem auto', padding: '1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>401 – Auth required</h1>
        <p style={{ marginTop: 12 }}>
          This area is protected. <a href="/admin/sign-in?next=/admin/orders">Sign in</a> to continue.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
