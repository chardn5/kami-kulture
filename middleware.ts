// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Run on all page requests (not assets/api) so we also catch /en/admin/* etc.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};

function decodeBasicAuth(header: string): { user: string; pass: string } | null {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const b64 = header.split(' ')[1] || '';
    const decoded = atob(b64);
    const i = decoded.indexOf(':');
    if (i === -1) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch { return null; }
}

// Matches /admin/* or /<locale>/admin/*   e.g. /en/admin/orders
function isAdminPath(pathname: string): boolean {
  return /^\/(?:[A-Za-z]{2}(?:-[A-Za-z]{2})?\/)?admin(?:\/|$)/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const USER = process.env.BASIC_AUTH_USER ?? process.env.ADMIN_USER ?? '';
  const PASS = process.env.BASIC_AUTH_PASS ?? process.env.ADMIN_PASS ?? '';

  const unauthorized = () =>
    new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area v2"' }, // changed realm busts browser cache
    });

  if (!USER || !PASS) return unauthorized();

  const creds = decodeBasicAuth(req.headers.get('authorization') || '');
  if (!creds || creds.user !== USER || creds.pass !== PASS) return unauthorized();

  const res = NextResponse.next();
  res.headers.set('x-admin-protected', '1'); // debug header
  return res;
}
