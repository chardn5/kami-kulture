import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { productThumbnail } from '@/lib/productThumbnail';

type Product = {
  slug: string;
  title: string;
  price: number;
  images: string[];
  description?: string;
  tags?: string[];
  colors?: string[];
  variants?: Array<{ isAvailable?: boolean }>;
};

export default function ProductCard({ product }: { product: Product }) {
  const thumbnail = productThumbnail(product.slug, product.images);
  const unavailable =
    product.variants && !product.variants.some((v) => v.isAvailable);
  return (
    <Link
      href={`/products/${product.slug}`}
      className="kk-focus group block overflow-hidden rounded-lg border border-white/10 bg-[#171711] transition hover:border-[#35d7f2]/60"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e4de]">
        <Image
          src={thumbnail}
          unoptimized={thumbnail.startsWith('https://images-api.printify.com/')}
          alt={product.title}
          fill
          sizes="(min-width:1024px) 45vw, (min-width:640px) 50vw, 100vw"
          className="object-cover transition duration-300 group-hover:scale-[1.025]"
        />
        {unavailable && (
          <span className="absolute left-3 top-3 rounded bg-black/80 px-3 py-1.5 text-xs font-semibold text-white">
            Currently unavailable
          </span>
        )}
        <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-md bg-[#f7f1df] text-black">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold leading-6">{product.title}</h2>
          <p className="shrink-0 font-semibold text-[#35d7f2]">
            {formatPrice(product.price)}
          </p>
        </div>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[#f7f1df]/60">
          {product.description}
        </p>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[#f7f1df]/50">
          {product.colors?.length ? `${product.colors.length} colors · ` : ""}
          Unisex fit · Printed to order
        </p>
      </div>
    </Link>
  );
}
