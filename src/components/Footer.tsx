import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-[#f7f1df]/10 bg-[#0b0b09]">
      <div className="kk-container grid gap-8 py-10 text-sm text-[#f7f1df]/74 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="text-base font-black uppercase text-[#f7f1df]">Kami Kulture</p>
          <p className="mt-2 max-w-sm leading-6">
            Original anime-inspired shirt designs, printed on demand and fulfilled through trusted production partners.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[#f7f1df]">Help</p>
          <div className="mt-3 flex flex-col gap-2">
            <a href="mailto:orders@kamikulture.com" className="kk-focus rounded-md hover:text-[#35d7f2]">
              orders@kamikulture.com
            </a>
            <Link href="/track-order" className="kk-focus rounded-md hover:text-[#35d7f2]">
              Track order
            </Link>
            <Link href="/shipping-returns" className="kk-focus rounded-md hover:text-[#35d7f2]">
              Shipping and returns
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-[#f7f1df]">Store</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/products" className="kk-focus rounded-md hover:text-[#35d7f2]">
              Shop products
            </Link>
            <Link href="/privacy" className="kk-focus rounded-md hover:text-[#35d7f2]">
              Privacy policy
            </Link>
            <Link href="/terms" className="kk-focus rounded-md hover:text-[#35d7f2]">
              Terms of service
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-[#f7f1df]/10">
        <div className="kk-container flex flex-col gap-3 py-5 text-xs text-[#f7f1df]/56 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} Kami Kulture. All rights reserved.</p>
          <p>Secure checkout with PayPal. Printed after purchase.</p>
        </div>
      </div>
    </footer>
  );
}
