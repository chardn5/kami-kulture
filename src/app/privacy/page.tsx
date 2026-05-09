export const metadata = {
  title: "Privacy Policy",
  description: "How Kami Kulture collects and uses information.",
};

export default function PrivacyPage() {
  return (
    <div className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Store policy</p>
      <h1 className="mt-2 text-3xl font-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#f7f1df]/58">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="mt-6 space-y-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6 text-sm leading-7 text-[#f7f1df]/72">
        <p>
          We collect only the information needed to process orders and provide support.
          This typically includes your name, email, shipping address, and payment details
          handled securely by our payment processor (PayPal). We do not store full card data.
        </p>
        <h2 className="text-lg font-black text-[#f7f1df]">Data Use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Order processing and customer support</li>
          <li>Fraud prevention and security</li>
          <li>Operational analytics (aggregate, non-identifying)</li>
        </ul>
        <h2 className="text-lg font-black text-[#f7f1df]">Third Parties</h2>
        <p>
          Payments are processed by PayPal. Transaction details may be shared with PayPal to
          prevent fraud and complete your purchase.
        </p>
        <h2 className="text-lg font-black text-[#f7f1df]">Your Rights</h2>
        <p>
          You may request deletion or export of your data. Contact us at{" "}
          <a href="mailto:support@kamikulture.com" className="text-[#35d7f2]">support@kamikulture.com</a>.
        </p>
      </div>
    </div>
  );
}
