export const metadata = {
  title: "Shipping & Returns",
  description: "Production times, shipping, returns and exchanges.",
};

export default function ShippingReturnsPage() {
  return (
    <div className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Order support</p>
      <h1 className="mt-2 text-3xl font-black">Shipping & Returns</h1>
      <p className="mt-2 text-sm text-[#f7f1df]/58">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="mt-6 space-y-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6 text-sm leading-7 text-[#f7f1df]/72">
        <h2 className="text-lg font-black text-[#f7f1df]">Production</h2>
        <p>
          Items are <strong>printed on demand</strong>. Please allow <strong>3-7 business days</strong>
          for production prior to shipment.
        </p>

        <h2 className="text-lg font-black text-[#f7f1df]">Shipping</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Tracking provided on dispatch.</li>
          <li>Transit times vary by destination and carrier.</li>
        </ul>

        <h2 className="text-lg font-black text-[#f7f1df]">Returns & Exchanges</h2>
        <p>
          Defective or incorrect items are eligible for replacement or refund within 30 days of delivery.
          For size exchanges, contact us and we’ll do our best to help.
        </p>
        <p>
          Start a request at{" "}
          <a href="mailto:support@kamikulture.com" className="text-[#35d7f2]">support@kamikulture.com</a> with your order ID and photos if applicable.
        </p>
      </div>
    </div>
  );
}
