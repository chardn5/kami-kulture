import { NextRequest, NextResponse } from 'next/server';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import { prisma } from '@/lib/prisma';
import { MANAGED_DESIGN_TAG, approvedTags, isSameOriginMutation } from '@/lib/designMetadata';
import { syncDesignDraft } from '@/lib/designCatalog';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminApiAccess(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSameOriginMutation(req.headers.get('origin'), req.url)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (typeof body?.approved !== 'boolean') return NextResponse.json({ error: 'Choose publish or unpublish.' }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product?.tags.includes(MANAGED_DESIGN_TAG)) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  try {
    if (body.approved) await syncDesignDraft(product.printifyId);
    const fresh = await prisma.product.findUniqueOrThrow({ where: { id }, include: { variants: true, images: true } });
    if (body.approved && (!fresh.images.length || !fresh.variants.some(v => v.isEnabled && v.isAvailable))) throw new Error('No available variants or mockups.');
    await prisma.product.update({ where: { id }, data: { visible: body.approved, tags: approvedTags(fresh.tags, body.approved) } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unable to confirm current availability. Please try again before publishing.' }, { status: 422 }); }
}
