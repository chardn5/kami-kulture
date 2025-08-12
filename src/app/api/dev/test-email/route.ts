// app/api/dev/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

function guard(req: NextRequest): NextResponse | null {
  if (process.env.EMAIL_DEBUG !== '1') {
    return new NextResponse('Not found', { status: 404 });
  }
  const requiredKey = process.env.TEST_EMAIL_KEY;
  if (requiredKey && req.headers.get('x-test-key') !== requiredKey) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export async function POST(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const to =
    isRecord(body) && typeof body.to === 'string'
      ? body.to
      : process.env.ORDER_TO_EMAIL || 'you@example.com';

  const subject =
    isRecord(body) && typeof body.subject === 'string'
      ? body.subject
      : 'Kami Kulture test';

  const html =
    isRecord(body) && typeof body.html === 'string' ? (body.html as string) : undefined;

  const res = await emailOrderJSON(subject, { ping: 'ok', ts: Date.now() }, { to, html });
  return NextResponse.json({ ok: true, res });
}

export async function GET(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const to = process.env.ORDER_TO_EMAIL || 'you@example.com';
  const res = await emailOrderJSON('Kami Kulture test (GET)', { ping: 'ok', ts: Date.now() }, { to });
  return NextResponse.json({ ok: true, res });
}
