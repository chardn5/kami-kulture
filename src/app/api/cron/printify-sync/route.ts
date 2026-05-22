import { NextRequest, NextResponse } from 'next/server';
import { syncOpenPrintifyOrders } from '@/lib/printifyOrderSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncOpenPrintifyOrders(50);
  return NextResponse.json(result);
}
