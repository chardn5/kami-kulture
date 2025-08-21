import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export const metadata = {
  title: "Products • Kami Kulture",
  description: "Shop all Kami Kulture products.",
};

export default function ProductsPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">All Products</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
