import type { MetadataRoute } from 'next';
import { products } from '@/data/products';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const items = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.9 },
    ...items,
  ];
}
