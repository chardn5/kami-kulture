import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';

export const metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Products</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map(p => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-2xl border">
              <Image src={p.images[0]} alt={p.title} fill className="object-contain bg-white transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">{p.title}</h3>
              <span className="text-sm">{formatPrice(p.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
