// /src/components/ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";

type Product = {
  slug: string;
  title: string;
  price: number;
  category?: string;
  images: string[];
  description?: string;
  tags?: string[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ProductCard({ product }: { product: Product }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [primary, secondary] = product.images ?? [];
  const img = primary ?? "/placeholder.png";
  const img2 = secondary ?? null;
  const tag = product.category ?? product.tags?.[0] ?? "Tee";

  return (
    <>
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          "kk-focus group block overflow-hidden rounded-lg border border-[#f7f1df]/12",
          "bg-[#171711] transition hover:-translate-y-0.5 hover:border-[#35d7f2]/55"
        )}
        aria-label={product.title}
      >
        <div className="relative aspect-[4/5] bg-[#0b0b09]">
          <Image
            src={img}
            alt={product.title}
            fill
            loading="lazy"
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className={cn(
              "object-cover transition duration-300",
              img2 ? "opacity-100 group-hover:opacity-0" : "",
            )}
            priority={false}
          />

          {img2 && (
            <Image
              src={img2}
              alt={`${product.title} alternate view`}
              fill
              loading="lazy"
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-contain opacity-0 transition duration-300 group-hover:opacity-100"
              priority={false}
            />
          )}

          <div className="absolute left-3 top-3 rounded-md bg-[#0f0f0c]/82 px-2.5 py-1 text-[11px] font-black uppercase text-[#d6ff57] ring-1 ring-[#d6ff57]/25">
            {tag}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setQuickViewOpen(true);
            }}
            className={cn(
              "kk-focus absolute bottom-3 left-3 right-3 hidden h-10 items-center justify-center rounded-md",
              "bg-[#f7f1df] text-sm font-black text-black opacity-0 transition group-hover:opacity-100 sm:inline-flex"
            )}
            aria-label={`Quick view ${product.title}`}
          >
            Quick view
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="line-clamp-1 text-sm font-black text-[#f7f1df]">
                {product.title}
              </h3>
              {product.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#f7f1df]/58">
                  {product.description}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-sm font-black text-[#35d7f2]">
              {formatPrice(product.price)}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setQuickViewOpen(true);
            }}
            className="kk-focus mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#f7f1df]/16 text-sm font-semibold text-[#f7f1df] sm:hidden"
            aria-label={`Quick view ${product.title} on mobile`}
          >
            Quick view
          </button>
        </div>
      </Link>

      {quickViewOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close quick view"
            onClick={() => setQuickViewOpen(false)}
          />

          <div className="relative z-[61] w-full max-w-3xl overflow-hidden rounded-lg border border-[#f7f1df]/14 bg-[#11110d] text-[#f7f1df] shadow-2xl">
            <div className="grid md:grid-cols-[1.1fr_0.9fr]">
              <div className="relative aspect-[4/5] bg-[#0b0b09] md:aspect-auto">
                <Image
                  src={img}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(min-width:768px) 50vw, 100vw"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-black uppercase text-[#ff4f5f]">{tag}</p>
                <h3 className="mt-2 text-2xl font-black">{product.title}</h3>
                <p className="mt-3 text-xl font-black text-[#35d7f2]">{formatPrice(product.price)}</p>
                {product.description ? (
                  <p className="mt-4 text-sm leading-6 text-[#f7f1df]/70">
                    {product.description}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="kk-focus inline-flex h-11 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57]"
                    onClick={() => setQuickViewOpen(false)}
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    className="kk-focus inline-flex h-11 items-center justify-center rounded-md border border-[#f7f1df]/18 px-4 text-sm font-semibold text-[#f7f1df] hover:bg-[#f7f1df]/8"
                    onClick={() => setQuickViewOpen(false)}
                    aria-label="Close quick view"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="kk-focus absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f7f1df]/18 bg-[#0f0f0c] text-[#f7f1df] hover:bg-[#f7f1df]/10"
              onClick={() => setQuickViewOpen(false)}
              aria-label="Close quick view"
              title="Close"
            >
              X
            </button>
          </div>
        </div>
      )}
    </>
  );
}
