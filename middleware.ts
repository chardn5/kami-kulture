// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// run on all routes; we'll filter inside
export const config = { matcher: '/(.*)' };

// match /admin/* or /<locale>/admin/*
const isAdmin = (p: string) => /^\/(?:[A-Za-z]{2}(?:-[A-Za-z]{2})?\/)?admin(?:\/|$)/.test(p);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // skip non-pages
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  if (!isAdmin(pathname)) return NextResponse.next();

  // NEW: require the admin_ok cookie for all /admin pages
  const hasSession = req.cookies.get('admin_ok')?.value === '1';
  if (!hasSession) {
    // Always go through the sign-in shim; it will 401 (popup) if needed,
    // then set the cookie and bounce back.
    const url = new URL('/admin/sign-in', req.url);
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
