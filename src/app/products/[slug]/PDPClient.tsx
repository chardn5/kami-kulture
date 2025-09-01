'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import dynamic from 'next/dynamic';
import { useCart } from '@/lib/cartStore';

const PaySection = dynamic(() => import('@/components/PaySection'), { ssr: false });

type Variant = { size: 'S' | 'M' | 'L' | 'XL'; sku?: string };
type Product = {
  slug: string;
  title: string;
  price: number;
  description?: string;
  images?: string[];
  category?: string;
  variants?: Variant[];
};

export default function PDPClient({ product, recs }: { product: Product; recs: Product[] }) {
  const sizesFromVariants = useMemo(() => {
    const vs = product.variants?.map(v => v.size) ?? [];
    return (vs.length ? Array.from(new Set(vs)) : ['S', 'M', 'L', 'XL']) as Array<'S' | 'M' | 'L' | 'XL'>;
  }, [product.variants]);

  const [selectedSize, setSelectedSize] = useState<string>(sizesFromVariants[0] ?? 'M');
  const images = product.images?.length ? product.images : ['/placeholder.jpg'];
  const [mainIdx, setMainIdx] = useState(0);

  // --- CART wiring ---
  const addToCart = useCart(s => s.add);
  const [justAdded, setJustAdded] = useState(false);

  // derive active SKU (use variant.sku if present; fallback to slug-size)
  const activeSku = useMemo(() => {
    const match = product.variants?.find(v => v.size === (selectedSize as Variant['size']));
    return match?.sku || `${product.slug}-${selectedSize}`;
  }, [product.variants, product.slug, selectedSize]);

  const handleAddToCart = () => {
    addToCart({
      sku: activeSku,
      title: product.title,
      price: product.price,
      image: images[0],
      size: selectedSize,
      qty: 1,
    });
    setJustAdded(true);
  };

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      {/* --- GALLERY --- */}
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-900">
            <Image src={images[mainIdx]} alt={product.title} fill className="object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setMainIdx(i)}
                  className={`h-16 w-16 relative overflow-hidden rounded ${i === mainIdx ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  <Image src={src} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* --- INFO + SIZE + CART + PAY --- */}
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <p className="text-emerald-300">{formatPrice(product.price)}</p>
          <p className="text-sm text-neutral-300">{product.description}</p>

          <p className="text-sm text-neutral-400">
            <span className="font-medium text-white">Printed on demand.</span> Please allow 3–7 business days before shipping.
          </p>

          {/* Sizes */}
          <div className="flex gap-2">
            {sizesFromVariants.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-xl text-sm ${selectedSize === size ? 'bg-emerald-500 text-black' : 'bg-neutral-800'}`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Add to Cart + feedback */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddToCart}
              className="rounded-xl px-4 py-2 bg-white text-black hover:opacity-90 transition"
              aria-label="Add item to cart"
            >
              Add to Cart
            </button>
            {justAdded && <span className="text-xs text-emerald-400">Added!</span>}
          </div>

          {/* OR buy now with PayPal */}
          <div className="pt-2">
            <p className="text-xs text-neutral-400 mb-1">or Buy Now</p>
            <PaySection
              productTitle={product.title}
              amount={product.price}
              selectedSize={selectedSize}
              productSlug={product.slug}
              sku={activeSku}
            />
          </div>

          {/* Recs */}
          {recs.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm text-neutral-300">You might also like</h2>
              <ul className="grid grid-cols-2 gap-4">
                {recs.map(r => (
                  <li key={r.slug}>
                    <Link href={`/products/${r.slug}`} className="block">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                        <Image src={r.images?.[0] ?? '/placeholder.jpg'} alt={r.title} fill className="object-cover" />
                      </div>
                      <p className="mt-1 text-sm">{r.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
