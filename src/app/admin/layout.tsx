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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const auth = h.get('authorization') || '';

  // IMPORTANT: include ADMIN_PASSWORD fallback (your env shows ADMIN_PASSWORD, not ADMIN_PASS)
  const USER =
    process.env.BASIC_AUTH_USER ??
    process.env.ADMIN_USER ??
    '';

  const PASS =
    process.env.BASIC_AUTH_PASS ??
    process.env.ADMIN_PASSWORD ??
    process.env.ADMIN_PASS ??
    '';

  const creds = decodeBasicAuth(auth);
  const ok = !!USER && !!PASS && !!creds && creds.user === USER && creds.pass === PASS;

  if (!ok) {
    // Render a simple 401 page (no sensitive data). This blocks the admin UI content.
    // (We can’t set the 401 status from a server component; the content is enough to prevent leakage.)
    return (
      <html lang="en">
        <body>
          <main style={{ maxWidth: 720, margin: '6rem auto', padding: '1rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>401 – Auth required</h1>
            <p style={{ marginTop: 12 }}>
              This area is protected. Please supply Basic Auth credentials.
            </p>
          </main>
        </body>
      </html>
    );
  }

  return <>{children}</>;
}
