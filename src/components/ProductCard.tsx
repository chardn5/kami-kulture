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
  images: string[]; // [primary, secondary?]
  description?: string;
};

export default function ProductCard({ product }: { product: Product }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [primary, secondary] = product.images ?? [];
  const img = primary ?? "/placeholder.png";
  const img2 = secondary ?? null;

  return (
    <>
      <Link
        href={`/products/${product.slug}`}
        className={[
          "group block rounded-2xl overflow-hidden",
          "bg-white/5 ring-1 ring-white/10 transition",
          "hover:ring-white/20 shadow-sm hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
        ].join(" ")}
        aria-label={product.title}
      >
        <div className="relative aspect-square bg-black/10">
          {/* Primary */}
          <Image
            src={img}
            alt={product.title}
            fill
            loading="lazy"
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className={[
              "object-contain transition-transform duration-300",
              "group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none",
              img2 ? "opacity-100 group-hover:opacity-0" : "",
            ].join(" ")}
            priority={false}
          />
          {/* Secondary (shows on hover if provided) */}
          {img2 && (
            <Image
              src={img2}
              alt={`${product.title} alternate view`}
              fill
              loading="lazy"
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
              priority={false}
            />
          )}

          {/* Quick View button (desktop hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // don’t follow the Link
              setQuickViewOpen(true);
            }}
            className={[
              "hidden sm:inline-flex absolute bottom-3 left-1/2 -translate-x-1/2",
              "items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black",
              "shadow backdrop-blur transition opacity-0 group-hover:opacity-100",
              "border border-white/60 hover:bg-white/95",
            ].join(" ")}
            aria-label={`Quick view ${product.title}`}
          >
            Quick view
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium text-white/90 line-clamp-1">
              {product.title}
            </h3>
            <span className="text-sm font-semibold text-white/90">
              {formatPrice(product.price)}
            </span>
          </div>
          {product.category ? (
            <p className="mt-1 text-xs text-white/50">{product.category}</p>
          ) : null}

          {/* Mobile quick view affordance */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setQuickViewOpen(true);
            }}
            className="sm:hidden mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            aria-label={`Quick view ${product.title} on mobile`}
          >
            Quick view
          </button>
        </div>
      </Link>

      {/* Quick View modal */}
      {quickViewOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close quick view"
            onClick={() => setQuickViewOpen(false)}
          />
          {/* Dialog */}
          <div className="relative z-[61] w-full max-w-2xl rounded-2xl bg-neutral-900 text-white border border-white/10 shadow-2xl overflow-hidden">
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-square bg-black/40">
                <Image
                  src={img}
                  alt={product.title}
                  fill
                  className="object-contain"
                  sizes="50vw"
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold">{product.title}</h3>
                {product.category && (
                  <p className="mt-1 text-sm text-white/60">{product.category}</p>
                )}
                <p className="mt-3 text-xl font-bold">{formatPrice(product.price)}</p>
                {product.description ? (
                  <p className="mt-3 text-sm text-white/70 line-clamp-6">
                    {product.description}
                  </p>
                ) : null}

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex items-center justify-center rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90"
                    onClick={() => setQuickViewOpen(false)}
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    onClick={() => setQuickViewOpen(false)}
                    aria-label="Close quick view"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Close (X) */}
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-neutral-900 text-white hover:bg-white/10"
              onClick={() => setQuickViewOpen(false)}
              aria-label="Close quick view"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
