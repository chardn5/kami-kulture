import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getProduct, getEnvShopId } from '@/lib/printify';
import { MANAGED_DESIGN_TAG, APPROVED_DESIGN_TAG, designSlug } from '@/lib/designMetadata';

export async function syncDesignDraft(printifyId: string) {
  const p = await getProduct(getEnvShopId(), printifyId);
  const tags = p.tags ?? [];
  const slug = designSlug(tags);
  if (!tags.includes(MANAGED_DESIGN_TAG) || !slug || !tags.includes('kami:garment:comfort-colors-1717')) throw new Error('This is not a managed Kami Kulture design.');
  const variants = p.variants.filter(v => v.is_enabled);
  if (!variants.length || !p.images?.length) throw new Error('The draft needs enabled variants and completed mockups.');
  const prices = variants.map(v => v.price);
  if (prices.some(price => !Number.isInteger(price) || price <= 0) || new Set(prices).size !== 1) throw new Error('All enabled variants must have the same valid retail price.');
  const existing = await prisma.product.findUnique({ where: { printifyId }, select: { visible: true, tags: true } });
  const approved = existing?.tags.includes(APPROVED_DESIGN_TAG) ?? false;
  const data = {
    title: p.title, description: p.description ?? '', slug,
    visible: existing?.visible ?? false,
    tags: [...tags.filter(t => t !== APPROVED_DESIGN_TAG), ...(approved ? [APPROVED_DESIGN_TAG] : [])],
    priceMinCents: Math.min(...prices), priceMaxCents: Math.max(...prices), currency: 'USD',
    optionsJson: p.options as Prisma.InputJsonValue, srcCreatedAt: p.created_at, srcUpdatedAt: p.updated_at,
  };
  const sizeAndColor = (ids: number[], type: string) => p.options.find(o => o.type === type)?.values.find(v => ids.includes(v.id))?.title;
  return prisma.$transaction(async tx => {
    const product = await tx.product.upsert({ where: { printifyId }, create: { printifyId, ...data }, update: data });
    await tx.productVariant.deleteMany({ where: { productId: product.id } });
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productVariant.createMany({ data: variants.map(v => ({ productId: product.id, variantId: v.id,
      sku: v.sku || `${slug}-${v.id}`, title: v.title || `${sizeAndColor(v.options, 'color')} / ${sizeAndColor(v.options, 'size')}`,
      optionIndexes: v.options, color: sizeAndColor(v.options, 'color'), size: sizeAndColor(v.options, 'size'),
      priceCents: v.price, isEnabled: v.is_enabled, isAvailable: v.is_available, grams: v.grams })) });
    await tx.productImage.createMany({ data: p.images.map((image, position) => ({ productId: product.id, url: image.src, position, variantIds: image.variant_ids ?? [] })) });
    return { id: product.id, slug: product.slug, title: product.title, approved };
  });
}
