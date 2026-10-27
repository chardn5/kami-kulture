import { NextRequest, NextResponse } from 'next/server';
import { completePayPalOrder } from '@/lib/paymentCompletion';
import { rateLimit } from '@/lib/rateLimit';
import { checkoutError } from '@/lib/checkout';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(`capture:${ip}`, 15, 60_000).ok) return NextResponse.json({ ok: false, error: 'Please wait a moment and try again.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const id = body?.paypalOrderId;
  if (typeof id !== 'string' || !/^[A-Z0-9]{10,32}$/.test(id)) return NextResponse.json({ ok: false, error: 'A valid PayPal order is required.' }, { status: 400 });
  try { return NextResponse.json({ ok: true, ...await completePayPalOrder(id) }); }
  catch (error) {
    if (error instanceof Error && error.message === 'PERSONAL_OFFER_USED')
      return NextResponse.json({ ok: false, error: checkoutError(error) }, { status: 409 });
    console.error('[checkout] capture failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ ok: false, error: 'We could not confirm payment yet. Try again with the same PayPal order, or contact support before making another payment.' }, { status: 502 });
  }
}
