import { NextRequest, NextResponse } from 'next/server';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import { retryPaymentEffects } from '@/lib/paymentCompletion';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(req: NextRequest) {
  if (!(await hasAdminApiAccess(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await retryPaymentEffects());
}
