// /src/app/products/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';
// import PaySection from '@/components/PaySection'; // if you use it on the page

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);
  return {
    title: product ? product.title : 'Product',
    description: product?.description ?? 'Kami Kulture product',
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find(p => p.slug === slug);

  if (!product) {
    return <main className="p-8">Not found</main>;
  }

  const img = product.images[0] ?? '/images/products/placeholder.jpg';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10">
          <Image src={img} alt={product.title} fill className="object-contain bg-white" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-white">{product.title}</h1>
          <p className="mt-2 text-lg text-slate-200">{formatPrice(product.price)}</p>
          {product.description && (
            <p className="mt-4 text-sm text-neutral-300">{product.description}</p>
          )}

          {product.sizes?.length ? (
            <div className="mt-6">
              <div className="mb-2 text-sm font-medium text-white">Sizes</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <span key={s} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {product.colors?.length ? (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-white">Colors</div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <span key={c} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* If you want PayPal here:
          <div className="mt-8">
            <PaySection itemTitle={product.title} amount={product.price} sku={product.slug} />
          </div>
          */}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/products" className="text-sm text-slate-300 hover:underline">
          ← Back to products
        </Link>
      </div>
    </main>
  );
}
