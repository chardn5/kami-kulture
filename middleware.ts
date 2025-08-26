// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Run on ALL requests so nothing slips through.
// We'll skip assets/API inside the function.
export const config = { matcher: '/(.*)' };

function decodeBasicAuth(header: string) {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const b64 = header.split(' ')[1] || '';
    const decoded = atob(b64); // Edge runtime
    const i = decoded.indexOf(':');
    if (i === -1) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

// Matches /admin/* OR /<locale>/admin/* (e.g., /en/admin/orders)
function isAdminPath(pathname: string): boolean {
  return /^\/(?:[A-Za-z]{2}(?:-[A-Za-z]{2})?\/)?admin(?:\/|$)/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and API routes explicitly
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/public/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/')
  ) {
    const res = NextResponse.next();
    res.headers.set('x-mw-hit', '1'); // debug: middleware ran
    return res;
  }

  // Only protect admin paths
  if (!isAdminPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set('x-mw-hit', '1'); // debug: middleware ran
    return res;
  }

 // /middleware.ts  (keep the rest as you have)
const USER =
  process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';

const PASS =
  process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';


  const unauthorized = () =>
    new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area v3"' }, // bump realm to bust cache
    });

  if (!USER || !PASS) return unauthorized();

  const creds = decodeBasicAuth(req.headers.get('authorization') || '');
  if (!creds || creds.user !== USER || creds.pass !== PASS) return unauthorized();

  const res = NextResponse.next();
  res.headers.set('x-mw-hit', '1');            // debug: middleware ran
  res.headers.set('x-admin-protected', '1');   // debug: admin auth passed
  return res;
}
