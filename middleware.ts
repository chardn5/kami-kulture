// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Run on all pages; we'll filter inside.
export const config = { matcher: '/(.*)' };

function decodeBasicAuth(header?: string) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const b64 = header.split(' ')[1] || '';
    const s = atob(b64);
    const i = s.indexOf(':');
    if (i === -1) return null;
    return { user: s.slice(0, i), pass: s.slice(i + 1) };
  } catch { return null; }
}

// Match /admin/* or /<locale>/admin/*
const isAdmin = (p: string) => /^\/(?:[A-Za-z]{2}(?:-[A-Za-z]{2})?\/)?admin(?:\/|$)/.test(p);

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Skip assets and API
  if (p.startsWith('/_next/') || p === '/favicon.ico' || p.startsWith('/api/')) {
    return NextResponse.next();
  }
  if (!isAdmin(p)) return NextResponse.next();

  // IMPORTANT: use || so empty BASIC_* don't block fallback to ADMIN_*
  const USER = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const PASS = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';

 const realm = req.cookies.get('admin_realm')?.value || 'Admin Area';

const unauthorized = () =>
  new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}"`,
      'Cache-Control': 'no-store',
    },
  });
  if (!USER || !PASS) return unauthorized();

  const creds = decodeBasicAuth(req.headers.get('authorization') || '');
  if (!creds || creds.user !== USER || creds.pass !== PASS) return unauthorized();

  return NextResponse.next();
}
