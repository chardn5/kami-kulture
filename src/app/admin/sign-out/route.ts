// src/app/admin/sign-out/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/';

  const res = NextResponse.redirect(new URL(next, url.origin));
  // Clear cookie
  res.cookies.set('admin_ok', '', { path: '/', maxAge: 0 });
  return res;
}
