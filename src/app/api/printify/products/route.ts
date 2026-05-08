// src/app/api/printify/products/route.ts
import { NextResponse } from 'next/server';
import { getEnvShopId, listProducts, PrintifyProduct } from '@/lib/printify';

export const runtime = 'nodejs';

async function fetchAllProducts(shopId: number) {
  const all: PrintifyProduct[] = [];
  let page = 1;
  const limit = 100; // Printify allows up to 100

  // Loop pages until we run out
  // Note: Printify returns { data, current_page, last_page } but sometimes last_page can be undefined on small catalogs.
  // We'll stop when returned data length < limit.
  // You can switch to current_page/last_page logic if you prefer.
  while (true) {
    const res = await listProducts(shopId, { page, limit, status: 'published' });
    const data = res?.data ?? [];
    all.push(...data);
    if (data.length < limit) break;
    page += 1;
  }
  return all;
}

export async function GET() {
  try {
    const shopId = getEnvShopId();
    const products = await fetchAllProducts(shopId);

    // Trim to fields we actually need on the client for now
    const lean = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description ?? '',
      images: p.images?.map(img => img.src) ?? [],
      variants: p.variants?.map(v => ({
        id: v.id,
        sku: v.sku,
        title: v.title,
        price: v.price, // cents
        is_enabled: v.is_enabled,
        is_available: v.is_available,
      })) ?? [],
      options: p.options?.map(o => ({
        name: o.name,
        type: o.type,
        values: o.values?.map(v => ({ id: v.id, title: v.title, color: v.color })) ?? [],
      })) ?? [],
      tags: p.tags ?? [],
      visible: p.visible,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return NextResponse.json({ count: lean.length, products: lean }, { status: 200 });
  } catch (err: unknown) {
    console.error('GET /api/printify/products error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
