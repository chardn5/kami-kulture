import type { MetadataRoute } from 'next';
import { getCatalogProducts } from '@/lib/catalog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogProducts();
  const items = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/shipping-returns`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/size-guide`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    ...items,
  ];
}
