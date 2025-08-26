// src/app/admin/sign-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

function ok(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  try {
    const [u, p] = atob(auth.split(' ')[1] || '').split(':');
    const USER = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
    const PASS = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
    return !!USER && !!PASS && u === USER && p === PASS;
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/admin/orders';

  if (!ok(req)) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  // Success → set cookie and redirect
  const res = NextResponse.redirect(new URL(next, url.origin));

  // Style A: name/value/options
  res.cookies.set('admin_ok', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',   // <-- lowercase
    path: '/',
    maxAge: 60 * 60,   // 1 hour
  });

  // // Style B: object form (also valid)
  // res.cookies.set({
  //   name: 'admin_ok',
  //   value: '1',
  //   httpOnly: true,
  //   secure: true,
  //   sameSite: 'lax',
  //   path: '/',
  //   maxAge: 60 * 60,
  // });

  return res;
}
