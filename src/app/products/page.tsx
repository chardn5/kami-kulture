// /src/app/products/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/products';
import ProductsClient from './ProductsClient';

export const metadata = {
  title: 'Products | Kami Kulture',
  description: 'Browse Kami Kulture designs and merch.',
};

export default function ProductsPage() {
  // derive categories (hide filter if none)
  const categories = Array.from(
    new Set(
      products
        .map(p => p.category)
        .filter((v): v is string => Boolean(v))
    )
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Products</h1>
      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
