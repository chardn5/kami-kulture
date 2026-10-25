import { NextRequest, NextResponse } from 'next/server';
import { syncOpenPrintifyOrders } from '@/lib/printifyOrderSync';
import { retryPaymentEffects } from '@/lib/paymentCompletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncOpenPrintifyOrders(50);
  const payments = await retryPaymentEffects();
  return NextResponse.json({ ...result, payments });
}
