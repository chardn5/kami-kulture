import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { retailPriceCents } from '../src/lib/retailPricing';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
async function main() {
try {
  const products = await db.product.findMany({ include: { variants: true } });
  // Validate the whole batch before changing any row. Old order snapshots are never touched.
  const plans = products.map(product => ({ product, variants: product.variants.filter(v => v.isEnabled).map(v => ({ ...v, next: retailPriceCents(v.size) })) }));
  if (apply) {
    await mkdir('.vercel/backups', { recursive: true });
    const backup = `.vercel/backups/retail-prices-${Date.now()}.json`;
    await writeFile(backup, JSON.stringify(products.map(p => ({ id: p.id, slug: p.slug, priceMinCents: p.priceMinCents, priceMaxCents: p.priceMaxCents,
      variants: p.variants.map(v => ({ id: v.id, priceCents: v.priceCents })) })), null, 2), { mode: 0o600 });
    console.log(`Rollback snapshot: ${backup}`);
    await db.$transaction(async tx => {
      for (const { product, variants } of plans) {
        if (!variants.length) continue;
        for (const price of new Set(variants.map(v => v.next))) await tx.productVariant.updateMany({ where: { id: { in: variants.filter(v => v.next === price).map(v => v.id) } }, data: { priceCents: price } });
        await tx.product.update({ where: { id: product.id }, data: { priceMinCents: Math.min(...variants.map(v => v.next)), priceMaxCents: Math.max(...variants.map(v => v.next)) } });
      }
    }, { timeout: 120000 });
  }
  console.log(JSON.stringify({ apply, products: plans.length, variants: plans.reduce((n, p) => n + p.variants.length, 0), pricesCents: [...new Set(plans.flatMap(p => p.variants.map(v => v.next)))] }));
} finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Retail price update failed. No credentials logged.'); process.exitCode = 1; });
