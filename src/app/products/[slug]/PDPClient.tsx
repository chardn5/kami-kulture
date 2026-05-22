'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cartStore';
import type { CatalogProduct, CatalogVariant } from '@/lib/catalog';

const swatches: Record<string, string> = {
  black: '#080807',
  white: '#f4efe2',
  red: '#d83342',
  pink: '#f3a2bd',
  navy: '#263b63',
  'navy blue': '#263b63',
};

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

function swatchStyle(color: string) {
  return { backgroundColor: swatches[color.toLowerCase()] ?? '#6f6a5f' };
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
    <div className="kk-container py-8 lg:py-12">
      <nav className="mb-6 flex items-center gap-2 text-sm text-[#f7f1df]/58">
        <Link href="/products" className="kk-focus rounded-md hover:text-[#35d7f2]">
          Products
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-[#f7f1df]/76">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="min-w-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[#f7f1df]/12 bg-[#171711] md:aspect-square">
            <Image
              src={images[mainIdx]}
              alt={product.title}
              fill
              priority
              sizes="(min-width:1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setMainIdx(i)}
                  className={`kk-focus relative aspect-square overflow-hidden rounded-md border bg-[#171711] ${
                    i === mainIdx ? 'border-[#d6ff57]' : 'border-[#f7f1df]/12'
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="self-start rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5 lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase text-[#ff4f5f]">Printed on demand</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#f7f1df] md:text-4xl">
            {product.title}
          </h1>
          <p className="mt-4 text-3xl font-black text-[#35d7f2]">{formatPrice(activePrice)}</p>
          {product.description ? (
            <p className="mt-4 text-sm leading-6 text-[#f7f1df]/68">{product.description}</p>
          ) : null}

          <div className="mt-6 space-y-6 border-y border-[#f7f1df]/10 py-6">
            {colorsFromVariants.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-[#f7f1df]">Color</p>
                  {selectedColor ? <p className="text-sm text-[#f7f1df]/58">{selectedColor}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorsFromVariants.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`kk-focus inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                        selectedColor === color
                          ? 'border-[#d6ff57] bg-[#d6ff57]/12 text-[#f7f1df]'
                          : 'border-[#f7f1df]/14 text-[#f7f1df]/72 hover:bg-[#f7f1df]/8'
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-[#f7f1df]/28"
                        style={swatchStyle(color)}
                      />
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-[#f7f1df]">Size</p>
                <p className="text-sm text-[#f7f1df]/58">{selectedSize}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {sizesFromVariants.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`kk-focus h-11 rounded-md border text-sm font-black ${
                      selectedSize === size
                        ? 'border-[#f7f1df] bg-[#f7f1df] text-black'
                        : 'border-[#f7f1df]/14 text-[#f7f1df]/72 hover:bg-[#f7f1df]/8'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              onClick={handleAddToCart}
              className="kk-focus inline-flex h-12 items-center justify-center rounded-md bg-[#f7f1df] px-5 text-sm font-black text-black transition hover:bg-[#d6ff57]"
              aria-label="Add item to cart"
            >
              Add to Cart
            </button>
            <Link
              href="/checkout"
              className="kk-focus inline-flex h-12 items-center justify-center rounded-md border border-[#f7f1df]/18 px-5 text-sm font-semibold text-[#f7f1df] transition hover:bg-[#f7f1df]/8"
            >
              Checkout
            </Link>
          </div>
          {justAdded && <p className="mt-3 text-sm font-semibold text-[#d6ff57]">Added to cart.</p>}

          <div className="mt-5 grid gap-3 text-sm text-[#f7f1df]/70">
            <div className="flex justify-between border-b border-[#f7f1df]/10 pb-3">
              <span>Production</span>
              <span className="font-semibold text-[#f7f1df]">3-7 business days</span>
            </div>
            <div className="flex justify-between border-b border-[#f7f1df]/10 pb-3">
              <span>Fabric</span>
              <span className="font-semibold text-[#f7f1df]">Soft cotton tee</span>
            </div>
            <div className="flex justify-between">
              <span>Support</span>
              <span className="font-semibold text-[#f7f1df]">Defect replacements</span>
            </div>
          </div>
        </aside>
      </div>

      {recs.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-[#ff4f5f]">More designs</p>
              <h2 className="mt-2 text-2xl font-black text-[#f7f1df]">You might also like</h2>
            </div>
            <Link href="/products" className="kk-focus rounded-md text-sm font-semibold text-[#35d7f2]">
              View all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map(r => (
              <Link
                key={r.slug}
                href={`/products/${r.slug}`}
                className="kk-focus group overflow-hidden rounded-lg border border-[#f7f1df]/12 bg-[#171711] transition hover:border-[#35d7f2]/55"
              >
                <div className="relative aspect-[4/5] bg-[#0b0b09]">
                  <Image
                    src={r.images?.[0] ?? '/placeholder.jpg'}
                    alt={r.title}
                    fill
                    className="object-cover"
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="line-clamp-1 text-sm font-black text-[#f7f1df]">{r.title}</p>
                  <p className="text-sm font-black text-[#35d7f2]">{formatPrice(r.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
