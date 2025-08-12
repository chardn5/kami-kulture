// app/api/dev/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

// Return 404 unless EMAIL_DEBUG=1. Optionally require a header key too.
function guard(req: NextRequest): NextResponse | null {
  if (process.env.EMAIL_DEBUG !== '1') {
    // Hide the route entirely when debug is off
    return new NextResponse('Not found', { status: 404 });
  }
  const requiredKey = process.env.TEST_EMAIL_KEY; // optional extra lock
  if (requiredKey && req.headers.get('x-test-key') !== requiredKey) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({} as any));
  const to = body?.to || process.env.ORDER_TO_EMAIL || 'you@example.com';
  const subject = body?.subject || 'Kami Kulture test';
  const html = body?.html as string | undefined;

  const res = await emailOrderJSON(subject, { ping: 'ok', ts: Date.now() }, { to, html });
  return NextResponse.json({ ok: true, res });
}

// Handy GET so you can hit it from a browser:
export async function GET(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const to = process.env.ORDER_TO_EMAIL || 'you@example.com';
  const res = await emailOrderJSON('Kami Kulture test (GET)', { ping: 'ok', ts: Date.now() }, { to });
  return NextResponse.json({ ok: true, res });
}
