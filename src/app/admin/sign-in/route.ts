// src/app/admin/sign-in/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function ok(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const [u, p] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');

  // Use || so empty BASIC_* fall back to ADMIN_*
  const USER = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const PASS = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  return !!USER && !!PASS && u === USER && p === PASS;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/admin/orders';

  // If not authorized yet -> trigger the browser’s popup for THIS realm
  if (!ok(req)) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }, // <— realm for admin
    });
  }

  // Authorized -> bounce to the requested admin page
  return NextResponse.redirect(new URL(next, url.origin));
}
