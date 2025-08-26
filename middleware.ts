// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Limit scope of middleware only to /admin
export const config = {
  matcher: ['/admin/:path*'],
};

// Edge-safe Basic auth decode (no Node Buffer in middleware)
function decodeBasicAuth(header: string): { user: string; pass: string } | null {
  if (!header.startsWith('Basic ')) return null;
  try {
    const b64 = header.split(' ')[1] || '';
    const decoded = atob(b64); // Edge runtime provides atob
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  // Only protect /admin/*
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') || '';
  const creds = decodeBasicAuth(header);

  // Support both env naming styles
  const USER = process.env.BASIC_AUTH_USER ?? process.env.ADMIN_USER ?? '';
  const PASS = process.env.BASIC_AUTH_PASS ?? process.env.ADMIN_PASS ?? '';

  const unauthorized = () =>
    new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });

  if (!USER || !PASS) return unauthorized();
  if (!creds) return unauthorized();

  if (creds.user !== USER || creds.pass !== PASS) {
    return unauthorized();
  }

  return NextResponse.next();
}
