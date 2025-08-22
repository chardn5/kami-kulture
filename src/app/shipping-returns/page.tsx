export const metadata = {
  title: "Shipping & Returns",
  description: "Production times, shipping, returns and exchanges.",
};

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <h1 className="text-2xl font-semibold">Shipping & Returns</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="prose prose-invert prose-sm mt-6 max-w-none">
        <h2>Production</h2>
        <p>
          Items are <strong>printed on demand</strong>. Please allow <strong>3–7 business days</strong>
          for production prior to shipment.
        </p>

        <h2>Shipping</h2>
        <ul>
          <li>Tracking provided on dispatch.</li>
          <li>Transit times vary by destination and carrier.</li>
        </ul>

        <h2>Returns & Exchanges</h2>
        <p>
          Defective or incorrect items are eligible for replacement or refund within 30 days of delivery.
          For size exchanges, contact us — we’ll do our best to help.
        </p>
        <p>
          Start a request at{" "}
          <a href="mailto:support@kamikulture.com">support@kamikulture.com</a> with your order ID and photos if applicable.
        </p>
      </div>
    </div>
  );
}
