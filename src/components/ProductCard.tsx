import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

type Product = {
  slug: string;
  title: string;
  price: number;
  category?: string;
  images: string[];
};

export default function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0] ?? "/placeholder.png";
  return (
    <Link
      href={`/products/${product.slug}`}
      className="block rounded-2xl overflow-hidden bg-white text-neutral-900 shadow-sm hover:shadow-md transition"
    >
      <div className="relative aspect-square">
        <Image
          src={img}
          alt={product.title}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium truncate">{product.title}</h3>
          <span className="font-semibold">{formatPrice(product.price)}</span>
        </div>
        {product.category ? (
          <p className="mt-1 text-sm text-neutral-500">{product.category}</p>
        ) : null}
      </div>
    </Link>
  );
}
