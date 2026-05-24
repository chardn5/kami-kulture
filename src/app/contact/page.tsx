export const metadata = {
  title: "Contact",
  description: "Contact Kami Kulture for order support, shipping questions, and store help.",
};

export default function ContactPage() {
  return (
    <main className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#35d7f2]">Support</p>
      <h1 className="mt-2 text-3xl font-black">Contact Kami Kulture</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f7f1df]/64">
        Need help with an order, shipping address, damaged item, or product question? Send
        the details and we will help from there.
      </p>

      <section className="mt-8 grid gap-4">
        <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6">
          <p className="text-xs font-black uppercase text-[#f7f1df]/44">Order support</p>
          <a
            href="mailto:support@kamikulture.com"
            className="kk-focus mt-2 inline-flex break-all text-xl font-black text-[#35d7f2] hover:underline"
          >
            support@kamikulture.com
          </a>
          <p className="mt-3 text-sm leading-6 text-[#f7f1df]/64">
            For order issues, include your order ID, checkout email, and photos when the
            item arrived damaged, misprinted, or incorrect.
          </p>
        </div>

        <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6">
          <p className="text-xs font-black uppercase text-[#f7f1df]/44">Typical response</p>
          <p className="mt-2 text-lg font-black">1-2 business days</p>
          <p className="mt-3 text-sm leading-6 text-[#f7f1df]/64">
            Address changes and cancellations are time-sensitive because orders can move into
            production quickly after payment.
          </p>
        </div>
      </section>
    </main>
  );
}
