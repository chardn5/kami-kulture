import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Kami Kulture",
  description: "The story behind Kami Kulture and how we make our tees.",
};

export default function AboutPage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl sm:text-4xl font-bold">About Kami Kulture</h1>
      <p className="mt-3 text-white/80 max-w-2xl">
        Anime‑inspired memes & quotes on premium tees — printed on demand.
        We keep drops small, focus on quality DTG prints, and ship fast in PH.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/60">Printing</p>
          <p className="mt-1 font-semibold">Premium DTG</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/60">Shipping</p>
          <p className="mt-1 font-semibold">Fast PH delivery</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/60">Payments</p>
          <p className="mt-1 font-semibold">PayPal (Sandbox)</p>
        </div>
      </div>

      <section className="mt-10 space-y-4 text-white/80 max-w-3xl">
        <h2 className="text-xl font-semibold text-white">What we care about</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Crisp, durable prints that don’t peel or crack.</li>
          <li>Comfortable blanks you’ll actually wear every week.</li>
          <li>Designs for fans, not mass‑market filler.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-white">Contact</h2>
        <p>
          Questions, bulk orders, or collabs? Email{" "}
          <Link href="mailto:orders@kamikulture.com" className="underline text-sky-400 hover:text-sky-300">
            orders@kamikulture.com
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
