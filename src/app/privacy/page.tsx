export const metadata = {
  title: "Privacy Policy",
  description: "How Kami Kulture collects and uses information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="prose prose-invert prose-sm mt-6 max-w-none">
        <p>
          We collect only the information needed to process orders and provide support.
          This typically includes your name, email, shipping address, and payment details
          handled securely by our payment processor (PayPal). We do not store full card data.
        </p>
        <h2>Data Use</h2>
        <ul>
          <li>Order processing and customer support</li>
          <li>Fraud prevention and security</li>
          <li>Operational analytics (aggregate, non-identifying)</li>
        </ul>
        <h2>Third Parties</h2>
        <p>
          Payments are processed by PayPal. Transaction details may be shared with PayPal to
          prevent fraud and complete your purchase.
        </p>
        <h2>Your Rights</h2>
        <p>
          You may request deletion or export of your data. Contact us at{" "}
          <a href="mailto:support@kamikulture.com">support@kamikulture.com</a>.
        </p>
      </div>
    </div>
  );
}
