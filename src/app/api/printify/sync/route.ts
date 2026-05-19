// src/app/api/printify/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getEnvShopId,
  listProducts,
  PrintifyProduct,
  PrintifyOption,
} from '@/lib/printify';

export const runtime = 'nodejs';

const LIMIT = 50;

function safeEquals(a: string, b: string) {
  return a.length === b.length && a === b;
}

function checkBasicAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(auth.split(' ')[1] ?? '', 'base64').toString();
    const [u, p] = decoded.split(':');
    const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
    const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
    return !!user && !!pass && u === user && p === pass;
  } catch {
    return false;
  }
}

function checkSyncAuth(req: NextRequest) {
  const secret = process.env.PRINTIFY_SYNC_SECRET;
  if (secret) {
    const headerSecret = req.headers.get('x-printify-sync-secret');
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    return safeEquals(headerSecret ?? '', secret) || safeEquals(bearer ?? '', secret);
  }

  return checkBasicAuth(req);
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: 'UNAUTHORIZED' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Printify Sync"',
        'Cache-Control': 'no-store',
      },
    }
  );
}

async function fetchAllProducts(shopId: number) {
  const all: PrintifyProduct[] = [];
  let page = 1;
  while (true) {
    const res = await listProducts(shopId, { page, limit: LIMIT, status: 'published' });
    const data = res?.data ?? [];
    all.push(...data);
    if (data.length < LIMIT) break;
    page += 1;
  }
  return all;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function deriveColorAndSize(
  variantOptionIds: number[],
  options: PrintifyOption[]
): { color?: string; size?: string } {
  let color: string | undefined;
  let size: string | undefined;

  for (const opt of options) {
    for (const val of opt.values) {
      if (variantOptionIds.includes(val.id)) {
        const name = opt.name.toLowerCase();
        if (name.includes('color') || name.includes('colour')) {
          color = val.title;
        } else if (name.includes('size')) {
          size = val.title;
        }
      }
    }
  }
  return { color, size };
}

export async function POST(req: NextRequest) {
  if (!checkSyncAuth(req)) return unauthorized();

  try {
    const shopId = getEnvShopId();
    const products = await fetchAllProducts(shopId);

    let created = 0;
    let updated = 0;

    for (const p of products) {
      // Compute price range from enabled+available variants
      const activeVariants = (p.variants ?? []).filter(v => v.is_enabled && v.is_available);
      const prices = activeVariants.map(v => v.price);
      const priceMinCents = prices.length ? Math.min(...prices) : 0;
      const priceMaxCents = prices.length ? Math.max(...prices) : 0;

      // Find existing product by printifyId
      const existing = await prisma.product.findUnique({
        where: { printifyId: p.id },
        select: { id: true, slug: true },
      });

      let productId: string;
      if (!existing) {
        // Fresh create: generate unique slug
        let base = slugify(p.title || 'product');
        if (!base) base = `product-${p.id.slice(-6)}`;

        // Ensure uniqueness if needed
        let finalSlug = base;
        let suffix = 1;
        while (await prisma.product.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = `${base}-${suffix++}`;
        }

        const createdRow = await prisma.product.create({
          data: {
            printifyId: p.id,
            title: p.title,
            slug: finalSlug,
            description: p.description ?? '',
            visible: p.visible ?? true,
            tags: p.tags ?? [],
            priceMinCents,
            priceMaxCents,
            currency: 'USD',
            optionsJson: p.options as Prisma.InputJsonValue,
            srcCreatedAt: p.created_at,
            srcUpdatedAt: p.updated_at,
          },
          select: { id: true },
        });

        productId = createdRow.id;
        created += 1;
      } else {
        const updatedRow = await prisma.product.update({
          where: { printifyId: p.id },
          data: {
            title: p.title,
            // keep slug stable once created
            description: p.description ?? '',
            visible: p.visible ?? true,
            tags: p.tags ?? [],
            priceMinCents,
            priceMaxCents,
            optionsJson: p.options as Prisma.InputJsonValue,
            srcCreatedAt: p.created_at,
            srcUpdatedAt: p.updated_at,
          },
          select: { id: true },
        });
        productId = updatedRow.id;
        updated += 1;
      }

      // Reset children for a clean sync (simplest, idempotent)
      await prisma.productImage.deleteMany({ where: { productId } });
      await prisma.productVariant.deleteMany({ where: { productId } });

      // Images
      const imagesData =
        (p.images ?? []).map((img, idx) => ({
          productId,
          url: img.src,
          position: idx,
          variantIds: (img.variant_ids ?? []) as number[],
        })) ?? [];

      if (imagesData.length) {
        await prisma.productImage.createMany({ data: imagesData });
      }

      // Variants
      const variantsData =
        (p.variants ?? []).map(v => {
          const { color, size } = deriveColorAndSize(v.options ?? [], p.options ?? []);
          return {
            productId,
            variantId: v.id,
            sku: v.sku ?? '',
            title: v.title,
            optionIndexes: (v.options ?? []) as number[],
            color,
            size,
            priceCents: v.price ?? 0,
            isEnabled: v.is_enabled ?? true,
            isAvailable: v.is_available ?? true,
            grams: v.grams ?? null,
          };
        }) ?? [];

      if (variantsData.length) {
        await prisma.productVariant.createMany({ data: variantsData });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        totals: { fetched: products.length, created, updated },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('POST /api/printify/sync error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Optional: allow GET to call the same sync for convenience
export const GET = POST;
