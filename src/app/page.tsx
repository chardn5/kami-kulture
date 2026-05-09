import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const heroImage = "/images/products/over9000/Person%201%20(1).png";

export default async function HomePage() {
  const products = await getCatalogProducts();
  const featured = products.slice(0, 8);

  return (
    <div className="pb-16">
      <section
        className="relative isolate flex h-[calc(100svh-120px)] min-h-[460px] max-h-[620px] items-end overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(8,8,6,0.92) 0%, rgba(8,8,6,0.72) 42%, rgba(8,8,6,0.2) 100%), url("${heroImage}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0f0f0c] to-transparent" />
        <div className="kk-container relative z-10 pb-12 pt-16">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex rounded-md border border-[#d6ff57]/40 bg-[#d6ff57]/12 px-3 py-1 text-xs font-black uppercase text-[#d6ff57]">
              New print-on-demand drops
            </p>
            <h1 className="text-5xl font-black leading-[0.95] text-[#f7f1df] md:text-7xl">
              Kami Kulture
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#f7f1df]/78 md:text-lg">
              Original anime-inspired tees built for gym days, con weekends, and daily rotation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="kk-focus inline-flex h-12 items-center rounded-md bg-[#f7f1df] px-5 text-sm font-black text-black transition hover:bg-[#d6ff57]"
              >
                Shop the drop
              </Link>
              <Link
                href="/shipping-returns"
                className="kk-focus inline-flex h-12 items-center rounded-md border border-[#f7f1df]/24 bg-black/22 px-5 text-sm font-semibold text-[#f7f1df] transition hover:bg-[#f7f1df]/10"
              >
                Shipping details
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f7f1df]/10 bg-[#171711]">
        <div className="kk-container grid gap-px py-0 md:grid-cols-3">
          {[
            ["Original artwork", "Inspired by anime culture without using protected characters."],
            ["Printed on demand", "Each shirt is produced after checkout to keep inventory lean."],
            ["PayPal checkout", "Card and wallet options route through PayPal's secure flow."],
          ].map(([title, body]) => (
            <div key={title} className="border-[#f7f1df]/10 py-5 md:border-l md:px-6 md:first:border-l-0">
              <p className="text-sm font-black uppercase text-[#35d7f2]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[#f7f1df]/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="kk-container mt-14">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#ff4f5f]">Featured designs</p>
              <h2 className="mt-2 text-3xl font-black text-[#f7f1df]">Wear the punchline.</h2>
            </div>
            <Link
              href="/products"
              className="kk-focus w-fit rounded-md border border-[#f7f1df]/18 px-4 py-2 text-sm font-semibold text-[#f7f1df]/82 transition hover:bg-[#f7f1df]/8 hover:text-[#f7f1df]"
            >
              View all products
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
