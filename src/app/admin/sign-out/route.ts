import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function newRealm() {
  return `Admin Area v${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/';

  const res = NextResponse.redirect(new URL(next, url.origin));

  // clear UI session
  res.cookies.set('admin_ok', '', { path: '/', maxAge: 0 });
  res.cookies.set('admin_session', '', { path: '/', maxAge: 0 });

  // rotate realm so the browser stops auto-sending old creds
  res.cookies.set('admin_realm', newRealm(), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
  });

  return res;
}
