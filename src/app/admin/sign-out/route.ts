import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/requestOrigin';

export const runtime = 'edge';

function shouldUseSecureCookies(req: NextRequest) {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || req.nextUrl.protocol.replace(':', '');
  const hostname = req.nextUrl.hostname;
  return protocol === 'https' && hostname !== 'localhost' && hostname !== '127.0.0.1';
}

function newRealm() {
  return `Admin Area v${Math.random().toString(36).slice(2, 8)}`;
}

async function signOut(req: NextRequest) {
  const url = new URL(req.url);
  const requested = url.searchParams.get('next');
  const next = requested === '/' ? '/' : '/admin/sign-in';
  const secure = shouldUseSecureCookies(req);

  const res = NextResponse.redirect(new URL(next, req.headers.get('origin') || url.origin), 303);

  // clear UI session
  res.cookies.set('admin_ok', '', { path: '/', maxAge: 0, secure });
  res.cookies.set('admin_session', '', { path: '/', maxAge: 0, secure });

  // rotate realm so the browser stops auto-sending old creds
  res.cookies.set('admin_realm', newRealm(), {
    httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
  });

  return res;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new NextResponse('Invalid origin', { status: 403 });
  return signOut(req);
}

// GET requests can be prefetched by Next.js and must never destroy a session.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/admin/sign-in', req.url));
}
