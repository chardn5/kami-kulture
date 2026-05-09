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
    <div>
      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
