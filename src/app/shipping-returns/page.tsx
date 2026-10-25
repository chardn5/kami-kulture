export const metadata = {
  title: "Shipping & Returns",
  description: "Production times, shipping, returns and exchanges.",
};

const lastUpdated = "October 25, 2026";

export default function ShippingReturnsPage() {
  return (
    <div className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Order support</p>
      <h1 className="mt-2 text-3xl font-black">Shipping & Returns</h1>
      <p className="mt-2 text-sm text-[#f7f1df]/58">Last updated: {lastUpdated}</p>

      <div className="mt-6 space-y-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6 text-sm leading-7 text-[#f7f1df]/72">
        <h2 className="text-lg font-black text-[#f7f1df]">Production</h2>
        <p>
          Kami Kulture items are <strong>printed on demand</strong>. Most orders need{" "}
          <strong>3-7 business days</strong> for production before the package is handed to
          the carrier.
        </p>

        <h2 className="text-lg font-black text-[#f7f1df]">Shipping</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Shipping is calculated for your actual items and delivery address before payment.</li>
          <li>Checkout confirms whether standard delivery is available for your destination. If no rate is available, payment stays disabled.</li>
          <li>All prices and shipping charges are shown in US dollars (USD). Your payment provider may apply currency conversion.</li>
          <li>Tracking is sent when the carrier provides it.</li>
          <li>Transit times vary by destination and carrier.</li>
          <li>Production time and transit time are separate. International orders may take longer due to customs and local delivery.</li>
          <li>Import duties, customs fees, and local taxes charged on arrival are not included in the checkout total and may be payable by the recipient.</li>
        </ul>
        <p>We do not promise a delivery date before a carrier estimate is available. If you need a shirt for a particular event, contact support before ordering. Multiple items may ship separately.</p>

        <h2 className="text-lg font-black text-[#f7f1df]">Returns & Exchanges</h2>
        <p>
          Defective, damaged, misprinted, or incorrect items are eligible for review within{" "}
          <strong>30 days of delivery</strong>. Because each item is made after purchase,
          returns for buyer preference or wrong size are not automatically guaranteed, but
          contact us and we will look for the best available option.
        </p>
        <p>
          Start a request at{" "}
          <a href="mailto:support@kamikulture.com" className="text-[#35d7f2]">
            support@kamikulture.com
          </a>{" "}
          with your order ID and clear photos if the item arrived damaged or incorrect.
        </p>

        <h2 className="text-lg font-black text-[#f7f1df]">Cancellations & Address Changes</h2>
        <p>
          If the order has not entered production yet, contact us as soon as possible and we
          will try to update or cancel it. Once production starts, changes may no longer be
          possible.
        </p>
      </div>
    </div>
  );
}
