// /src/app/products/[slug]/page.tsx
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';
import PDPClient from './PDPClient';

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);
  return {
    title: product ? `${product.title} | Kami Kulture` : 'Product | Kami Kulture',
    description: product?.description ?? 'Kami Kulture product',
    openGraph: {
      title: product ? `${product.title} | Kami Kulture` : 'Product | Kami Kulture',
      description: product?.description ?? 'Kami Kulture product',
      images: product?.images?.length ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);

  if (!product) return null;

  const recs = products
    .filter(p => p.slug !== product.slug)
    .slice(0, 3);

  return <PDPClient product={product} recs={recs} />;
}
