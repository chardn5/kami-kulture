// src/app/admin/layout.tsx
import { headers } from 'next/headers';

function decodeBasicAuth(header: string): { user: string; pass: string } | null {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const b64 = header.split(' ')[1] || '';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i === -1) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic'; // ensure this runs on every request

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: headers() is async in your setup
  const h = await headers();
  const auth = h.get('authorization') ?? '';

  // Treat empty BASIC_* as unset and fall back to ADMIN_*
  const USER =
    process.env.BASIC_AUTH_USER ||
    process.env.ADMIN_USER ||
    '';
  const PASS =
    process.env.BASIC_AUTH_PASS ||
    process.env.ADMIN_PASSWORD || // you have ADMIN_PASSWORD in Vercel
    process.env.ADMIN_PASS ||
    '';

  const creds = decodeBasicAuth(auth);
  const ok = !!USER && !!PASS && !!creds && creds.user === USER && creds.pass === PASS;

  if (!ok) {
    // Block the admin UI if not authorized (no popup here—just a hard gate)
    return (
      <section style={{ maxWidth: 720, margin: '6rem auto', padding: '1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>401 – Auth required</h1>
        <p style={{ marginTop: 12 }}>
  This area is protected. <a href="/api/orders">Sign in</a> to continue.
</p>
      </section>
    );
  }

  return <>{children}</>;
}
