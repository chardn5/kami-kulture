// app/api/dev/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-test-key');
  if (!auth || auth !== process.env.RESEND_TEST_KEY) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const from = process.env.EMAIL_FROM!;
  const to = process.env.ORDER_TO_EMAIL!;
  const key = process.env.RESEND_API_KEY!;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: 'Kami Kulture – Resend debug',
        text: `Debug test at ${new Date().toISOString()}`,
      }),
      cache: 'no-store',
    });

    const body = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, body, from, to }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
