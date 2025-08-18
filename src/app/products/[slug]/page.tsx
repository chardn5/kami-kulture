import Image from 'next/image';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';
import PaySection from '@/components/PaySection';

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const product = products.find(p => p.slug === params.slug);
  return {
    title: product ? product.title : 'Product',
    description: product?.description ?? 'Kami Kulture product',
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find(p => p.slug === params.slug);
  if (!product) return <main className="p-8">Not found</main>;

  const img = product.images[0] ?? '/images/products/placeholder.jpg';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border">
          <Image src={img} alt={product.title} fill className="object-contain bg-white" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <p className="mt-2 text-lg">{formatPrice(product.price)}</p>
          {product.description && <p className="mt-4 text-sm text-neutral-600">{product.description}</p>}

          {/* (Optional) show sizes/colors */}
          {product.sizes && (
            <div className="mt-6">
              <div className="mb-2 text-sm font-medium">Sizes</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => (
                  <span key={s} className="rounded-xl border px-3 py-1 text-sm">{s}</span>
                ))}
              </div>
            </div>
          )}
          {product.colors && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Colors</div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map(c => (
                  <span key={c} className="rounded-xl border px-3 py-1 text-sm">{c}</span>
                ))}
              </div>
            </div>
          )}

          <PaySection itemTitle={product.title} amount={product.price} sku={product.slug} />
        </div>
      </div>
    </main>
  );
}
