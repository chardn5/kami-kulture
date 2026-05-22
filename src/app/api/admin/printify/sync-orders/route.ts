import { NextRequest, NextResponse } from 'next/server';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import { syncOpenPrintifyOrders } from '@/lib/printifyOrderSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await hasAdminApiAccess(req))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const result = await syncOpenPrintifyOrders(Number.isFinite(limit) ? limit : 50);

  return NextResponse.json(result);
}
