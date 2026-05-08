'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import dynamic from 'next/dynamic';
import { useCart } from '@/lib/cartStore';
import type { CatalogProduct, CatalogVariant } from '@/lib/catalog';

const PaySection = dynamic(() => import('@/components/PaySection'), { ssr: false });

function uniqueDefined(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function firstVariantValue(
  variants: CatalogVariant[] | undefined,
  key: 'size' | 'color',
  fallback?: string[]
) {
  return variants?.find((variant) => variant[key])?.[key] ?? fallback?.[0] ?? '';
}

function skuPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PDPClient({ product, recs }: { product: CatalogProduct; recs: CatalogProduct[] }) {
  const colorsFromVariants = useMemo(() => {
    const colors = uniqueDefined(product.variants?.map((variant) => variant.color) ?? []);
    return colors.length ? colors : product.colors ?? [];
  }, [product.colors, product.variants]);

  const [selectedColor, setSelectedColor] = useState<string>(
    firstVariantValue(product.variants, 'color', product.colors)
  );

  const sizesFromVariants = useMemo(() => {
    const variants = product.variants ?? [];
    const matchingVariants = selectedColor
      ? variants.filter((variant) => variant.color === selectedColor)
      : variants;
    const sizes = uniqueDefined(matchingVariants.map((variant) => variant.size));
    if (sizes.length) return sizes;
    if (product.sizes?.length) return product.sizes;
    return ['S', 'M', 'L', 'XL', '2XL'];
  }, [product.sizes, product.variants, selectedColor]);

  const [selectedSize, setSelectedSize] = useState<string>(
    firstVariantValue(product.variants, 'size', product.sizes) || 'M'
  );
  const images = product.images?.length ? product.images : ['/placeholder.jpg'];
  const [mainIdx, setMainIdx] = useState(0);

  // --- CART wiring ---
  const addToCart = useCart(s => s.add);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!colorsFromVariants.length) return;
    if (!colorsFromVariants.includes(selectedColor)) {
      setSelectedColor(colorsFromVariants[0] ?? '');
    }
  }, [colorsFromVariants, selectedColor]);

  useEffect(() => {
    if (!sizesFromVariants.includes(selectedSize)) {
      setSelectedSize(sizesFromVariants[0] ?? '');
    }
  }, [selectedSize, sizesFromVariants]);

  const activeVariant = useMemo(() => {
    const variants = product.variants ?? [];
    if (!variants.length) return undefined;

    return (
      variants.find(
        (variant) =>
          (!selectedColor || variant.color === selectedColor) &&
          (!selectedSize || variant.size === selectedSize)
      ) ??
      variants.find((variant) => !selectedSize || variant.size === selectedSize) ??
      variants[0]
    );
  }, [product.variants, selectedColor, selectedSize]);

  const activePrice = activeVariant?.price ?? product.price;

  const activeSku = useMemo(() => {
    const fallbackOptions = [selectedColor, selectedSize].filter(Boolean).map(skuPart);
    return activeVariant?.sku || [product.slug, ...fallbackOptions].filter(Boolean).join('-');
  }, [activeVariant?.sku, product.slug, selectedColor, selectedSize]);

  const handleAddToCart = () => {
    addToCart({
      sku: activeSku,
      title: product.title,
      price: activePrice,
      image: images[0],
      size: selectedSize,
      color: selectedColor || undefined,
      printifyProductId: activeVariant?.printifyProductId ?? product.printifyId,
      printifyVariantId: activeVariant?.variantId,
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
            <Image src={images[mainIdx]} alt={product.title} fill className="object-contain" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setMainIdx(i)}
                  className={`h-16 w-16 relative overflow-hidden rounded ${i === mainIdx ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  <Image src={src} alt="" fill className="object-contain" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* --- INFO + SIZE + CART + PAY --- */}
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <p className="text-emerald-300">{formatPrice(activePrice)}</p>
          <p className="text-sm text-neutral-300">{product.description}</p>

          <p className="text-sm text-neutral-400">
            <span className="font-medium text-white">Printed on demand.</span> Please allow 3–7 business days before shipping.
          </p>

          {colorsFromVariants.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-neutral-300">Color</p>
              <div className="flex flex-wrap gap-2">
                {colorsFromVariants.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-xl px-4 py-2 text-sm ${
                      selectedColor === color ? 'bg-emerald-500 text-black' : 'bg-neutral-800'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              amount={activePrice}
              selectedSize={selectedSize}
              selectedColor={selectedColor || undefined}
              productSlug={product.slug}
              sku={activeSku}
              image={images[0]}
              printifyProductId={activeVariant?.printifyProductId ?? product.printifyId}
              printifyVariantId={activeVariant?.variantId}
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
                        <Image src={r.images?.[0] ?? '/placeholder.jpg'} alt={r.title} fill className="object-contain" />
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
