// /src/app/products/page.tsx
import { getCatalogProducts } from '@/lib/catalog';
import ProductsClient from './ProductsClient';

export const metadata = {
  title: 'Products | Kami Kulture',
  description: 'Browse Kami Kulture designs and merch.',
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await getCatalogProducts();
  // derive categories from product tags
  const categories = Array.from(new Set(products.flatMap(p => p.tags ?? [])));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Products</h1>
      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
