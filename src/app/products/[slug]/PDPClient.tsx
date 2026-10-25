"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Ruler,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cartStore";
import type { CatalogProduct } from "@/lib/catalog";
import { getGarment } from "@/data/garments";
import SizeChart from "@/components/SizeChart";

const swatches: Record<string, string> = {
  graphite: "#50504c",
  ivory: "#e9e3c9",
  "china blue": "#556b8d",
  white: "#f4f2e9",
  "light pink": "#efb6c7",
  "heather red": "#b74b55",
};

export default function PDPClient({
  product,
  recs,
}: {
  product: CatalogProduct;
  recs: CatalogProduct[];
}) {
  const available = product.variants?.filter((v) => v.isAvailable) ?? [];
  const first = available[0];
  const [color, setColor] = useState(first?.color ?? product.colors?.[0] ?? "");
  const [size, setSize] = useState(first?.size ?? product.sizes?.[0] ?? "");
  const [gallery, setGallery] = useState({ color, index: 0 });
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const sizeDialog = useRef<HTMLDialogElement>(null);
  const variant = product.variants?.find(
    (v) => v.color === color && v.size === size,
  );
  const colorVariant = product.variants?.find(
    (v) => v.color === color && v.images?.length,
  );
  const images = colorVariant?.images?.length
    ? colorVariant.images.slice(0, 8)
    : product.images;
  const mainIndex =
    gallery.color === color && gallery.index < images.length
      ? gallery.index
      : 0;
  const garment = getGarment(product.slug, product.garmentKey);

  function chooseColor(next: string) {
    setColor(next);
    setGallery({ color: next, index: 0 });
    setAdded(false);
    if (
      !product.variants?.some(
        (v) => v.color === next && v.size === size && v.isAvailable,
      )
    ) {
      setSize(
        product.variants?.find((v) => v.color === next && v.isAvailable)
          ?.size ?? "",
      );
    }
  }
  function addItem() {
    if (!variant?.isAvailable || !variant.sku || !variant.variantId) return;
    add({
      sku: variant.sku,
      title: product.title,
      qty: 1,
      price: product.price,
      color,
      size,
      image: images[0],
      printifyProductId: variant.printifyProductId,
      printifyVariantId: variant.variantId,
    });
    setAdded(true);
  }

  return (
    <div className="kk-container py-6 md:py-10">
      <Link
        href="/products"
        className="kk-focus mb-6 inline-flex items-center gap-2 text-sm text-[#f7f1df]/60"
      >
        <ArrowLeft size={15} /> All designs
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-12">
        <section className="min-w-0" aria-label="Product gallery">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#e8e6e1] md:aspect-square">
            {images[mainIndex] && (
              <Image
                src={images[mainIndex]}
                alt={`${product.title} in ${color}, view ${mainIndex + 1}`}
                fill
                priority
                sizes="(min-width:1024px) 55vw, 100vw"
                className="object-contain"
              />
            )}
            <span className="absolute bottom-3 left-3 rounded bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">
              {colorVariant?.images?.length
                ? `${color} · Studio mockup`
                : "Design reference"}
            </span>
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === mainIndex}
                  onClick={() => setGallery({ color, index: i })}
                  className={`kk-focus relative aspect-square overflow-hidden rounded border bg-[#e8e6e1] ${i === mainIndex ? "border-[#d6ff57] ring-1 ring-[#d6ff57]" : "border-transparent"}`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="90px"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="min-w-0 self-start lg:sticky lg:top-24">
          <p className="kk-eyebrow">Kami Kulture / Graphic tees</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
            {product.title}
          </h1>
          <p className="mt-4 text-2xl font-bold">
            {formatPrice(product.price)}{" "}
            <span className="text-xs font-medium text-[#f7f1df]/50">USD</span>
          </p>
          <p className="mt-4 text-sm leading-7 text-[#f7f1df]/70">
            {product.description}
          </p>
          <div className="mt-7 border-t border-white/15 pt-5">
            <p className="mb-3 text-sm font-bold">
              Color{" "}
              <span className="ml-2 font-normal text-[#f7f1df]/60">
                {color}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors?.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === color}
                  onClick={() => chooseColor(c)}
                  className={`kk-focus inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${c === color ? "border-[#d6ff57] text-[#d6ff57]" : "border-white/20"}`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ background: swatches[c.toLowerCase()] ?? "#777" }}
                  />
                  {c}
                </button>
              ))}
            </div>
            <div className="mb-3 mt-6 flex items-center justify-between">
              <p className="text-sm font-bold">
                Size{" "}
                <span className="ml-2 font-normal text-[#f7f1df]/60">
                  {size}
                </span>
              </p>
              <button
                type="button"
                onClick={() => sizeDialog.current?.showModal()}
                className="kk-focus inline-flex items-center gap-1.5 text-sm text-[#35d7f2] underline underline-offset-4"
              >
                <Ruler size={15} /> Size guide
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {product.sizes?.map((s) => {
                const enabled = product.variants?.some(
                  (v) => v.color === color && v.size === s && v.isAvailable,
                );
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={s === size}
                    title={!enabled ? `${s} unavailable in ${color}` : s}
                    onClick={() => {
                      setSize(s);
                      setAdded(false);
                    }}
                    className={`kk-focus h-11 rounded-md border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through ${s === size && enabled ? "border-[#f7f1df] bg-[#f7f1df] text-black" : "border-white/20"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!variant?.isAvailable}
              onClick={addItem}
              className="kk-button mt-6 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {added ? <Check size={18} /> : <ShoppingBag size={18} />}
              {!variant?.isAvailable
                ? "Currently unavailable"
                : added
                  ? "Added to your cart"
                  : "Add to cart"}
            </button>
            {added && (
              <Link
                href="/checkout"
                className="kk-focus mt-3 inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-[#35d7f2]"
              >
                Continue to checkout <ArrowRight size={16} />
              </Link>
            )}
            {!available.length && (
              <p role="status" className="mt-3 text-sm text-[#f7f1df]/60">
                We are confirming availability with our production partner.{" "}
                <Link className="underline" href="/contact">
                  Contact us
                </Link>{" "}
                for help.
              </p>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-[#f7f1df]/65">
              <Truck size={16} /> Made to order. Production usually takes 3-7
              business days.
            </p>
            <Link
              href="/shipping-returns"
              className="kk-focus mt-2 inline-block text-xs text-[#35d7f2] underline underline-offset-4"
            >
              Shipping calculated for your address at checkout
            </Link>
          </div>
          <div className="mt-7 divide-y divide-white/15 border-y border-white/15">
            <details className="py-4" open>
              <summary className="kk-focus cursor-pointer text-sm font-bold">
                The shirt
              </summary>
              <p className="mt-3 text-sm leading-6 text-[#f7f1df]/65">
                {garment?.description}
              </p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#f7f1df]/50">Garment</dt>
                  <dd>{garment?.name ?? product.garment}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#f7f1df]/50">Fabric</dt>
                  <dd className="text-right">{garment?.fabric}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#f7f1df]/50">Weight</dt>
                  <dd>{garment?.weight}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-[#f7f1df]/50">
                {garment?.notes}
              </p>
            </details>
            <details className="py-4">
              <summary className="kk-focus cursor-pointer text-sm font-bold">
                Care & keeping
              </summary>
              <p className="mt-3 text-sm leading-6 text-[#f7f1df]/65">
                Wash inside out in cold water with similar colors. Tumble dry
                low. Do not iron directly on the print. Follow the care label on
                your shirt.
              </p>
            </details>
            <details className="py-4">
              <summary className="kk-focus cursor-pointer text-sm font-bold">
                Delivery & returns
              </summary>
              <p className="mt-3 text-sm leading-6 text-[#f7f1df]/65">
                Each shirt is printed after ordering. Delivery time is
                production plus carrier transit. Report damaged, misprinted, or
                incorrect items within 30 days of delivery. Check your size
                before ordering; preference and size exchanges are reviewed case
                by case.
              </p>
              <Link
                href="/shipping-returns"
                className="kk-focus mt-3 inline-block text-sm text-[#35d7f2] underline"
              >
                Full shipping & returns policy
              </Link>
            </details>
          </div>
        </section>
      </div>
      <dialog
        ref={sizeDialog}
        aria-labelledby="size-title"
        className="kk-dialog w-[calc(100%_-_2rem)] max-w-xl rounded-lg border border-white/20 bg-[#171711] p-5 text-[#f7f1df] sm:p-7"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              sizeDialog.current?.close();
          }
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="size-title" className="text-xl font-black">
            Find your fit
          </h2>
          <button
            type="button"
            aria-label="Close size guide"
            title="Close size guide"
            className="kk-icon"
            onClick={() => sizeDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <SizeChart slug={product.slug} garmentKey={product.garmentKey} />
        <Link
          href="/size-guide"
          className="kk-focus mt-4 inline-block text-sm text-[#35d7f2] underline"
        >
          How to measure your shirt
        </Link>
      </dialog>
      {!!recs.length && (
        <section className="mt-16 border-t border-white/15 pt-8">
          <p className="kk-eyebrow">One more for the rotation</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {recs.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="kk-focus flex items-center gap-5"
              >
                <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded bg-white/5">
                  <Image
                    src={p.images[0]}
                    alt={p.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-bold">{p.title}</h2>
                  <p className="mt-2 text-sm text-[#f7f1df]/65">
                    {formatPrice(p.price)}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm text-[#35d7f2]">
                    View design <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
