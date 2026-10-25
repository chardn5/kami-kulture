import { NextRequest, NextResponse } from 'next/server';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import { syncDesignDraft } from '@/lib/designCatalog';
import { z } from 'zod';
import { isSameOriginMutation } from '@/lib/designMetadata';

export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  if (!(await hasAdminApiAccess(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSameOriginMutation(req.headers.get('origin'), req.url)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const parsed = z.object({ productIds: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(10) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide up to 10 valid Printify product IDs.' }, { status: 400 });
  const results = [];
  for (const id of new Set(parsed.data.productIds)) {
    try { results.push({ printifyId: id, ok: true, product: await syncDesignDraft(id) }); }
    catch { results.push({ printifyId: id, ok: false, error: 'Could not import this draft. Check its tags, variants, and generated mockups.' }); }
  }
  return NextResponse.json({ ok: results.every(r => r.ok), results }, { headers: { 'Cache-Control': 'no-store' } });
}
