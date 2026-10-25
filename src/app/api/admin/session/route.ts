import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, createAdminSessionToken } from '@/lib/adminSession';
import { safeAdminNext, validAdminCredentials } from '@/lib/adminLogin';
import { rateLimit } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/requestOrigin';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return new NextResponse('Invalid origin', { status: 403 });
  if (Number(req.headers.get('content-length') ?? 0) > 4096) return new NextResponse('Request too large', { status: 413 });
  const data = await req.formData().catch(() => null);
  const next = safeAdminNext(data?.get('next')?.toString());
  const origin = req.headers.get('origin')!;
  const fail = (error: string) => NextResponse.redirect(new URL(`/admin/sign-in?error=${error}&next=${encodeURIComponent(next)}`, origin), 303);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60_000).ok) return fail('limit');
  const user = data?.get('username')?.toString() ?? '';
  const password = data?.get('password')?.toString() ?? '';
  if (user.length > 200 || password.length > 500 || !validAdminCredentials(user, password)) return fail('credentials');
  const res = NextResponse.redirect(new URL(next, origin), 303);
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_MAX_AGE_SECONDS });
  res.cookies.set('admin_ok', '', { path: '/', maxAge: 0 });
  return res;
}
