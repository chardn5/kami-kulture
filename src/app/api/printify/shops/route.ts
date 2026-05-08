// src/app/api/printify/shops/route.ts
import { NextResponse } from 'next/server';
import { getShops } from '@/lib/printify';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const shops = await getShops();
    return NextResponse.json({ count: shops.length, shops }, { status: 200 });
  } catch (err: unknown) {
    console.error('GET /api/printify/shops error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
