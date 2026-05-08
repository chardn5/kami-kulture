// /src/app/products/[slug]/page.tsx
import type { Metadata } from 'next';
import { getCatalogProduct, getCatalogProducts, type CatalogProduct } from '@/lib/catalog';
import PDPClient from './PDPClient';
import { notFound } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com';
const DEFAULT_DESC = 'Anime-inspired designs printed on demand.';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  const title = product ? `${product.title}` : 'Product';
  const description = product?.description ?? DEFAULT_DESC;
  const url = new URL(`/products/${slug}`, SITE_URL).toString();
  const ogImages =
    product?.images?.length ? product.images.map((u) => ({ url: u })) : [{ url: '/og.png' }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
  title,
  description,
  url,
  // Note: Next Metadata doesn't support 'product' here.
  // Using 'website' is valid and keeps OG tags type-safe.
  type: 'website',
  images: ogImages,
  siteName: 'Kami Kulture',
},

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product?.images?.length ? [product.images[0]] : ['/og.png'],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await getCatalogProducts();
  const product = products.find(p => p.slug === slug);
  if (!product) { notFound(); }

  // simple recs (exclude current)
  const recs = products.filter(p => p.slug !== product.slug).slice(0, 3);

  const canonical = new URL(`/products/${slug}`, SITE_URL).toString();

  return (
    <>
      <ProductJsonLd product={product} url={canonical} />
      <PDPClient product={product} recs={recs} />
    </>
  );
}

/** ---- JSON-LD (server-rendered) ---- */
function ProductJsonLd({ product, url }: { product: CatalogProduct; url: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || undefined,
    image: product.images.length ? product.images : undefined,
    sku: product.variants?.find((variant) => variant.sku)?.sku || undefined,
    brand: { '@type': 'Brand', name: 'Kami Kulture' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: product.price.toFixed(2),
      availability: 'https://schema.org/InStock',
    },
    ...(typeof product.rating === 'number' && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.ratingCount ?? 1,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
