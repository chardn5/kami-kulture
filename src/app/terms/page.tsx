export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern using Kami Kulture.",
};

export default function TermsPage() {
  return (
    <div className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Store policy</p>
      <h1 className="mt-2 text-3xl font-black">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#f7f1df]/58">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="mt-6 space-y-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-6 text-sm leading-7 text-[#f7f1df]/72">
        <h2 className="text-lg font-black text-[#f7f1df]">Purchases</h2>
        <p>
          By placing an order you confirm that you are authorized to use the selected payment method.
          Orders may be canceled or refunded at our discretion if fraudulent or unavailable.
        </p>
        <h2 className="text-lg font-black text-[#f7f1df]">Intellectual Property</h2>
        <p>
          Artwork and content are owned by Kami Kulture. You may not reproduce or resell designs
          without written permission.
        </p>
        <h2 className="text-lg font-black text-[#f7f1df]">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Kami Kulture is not liable for indirect or
          consequential damages arising from use of the site.
        </p>
        <h2 className="text-lg font-black text-[#f7f1df]">Contact</h2>
        <p>
          For any questions email <a href="mailto:support@kamikulture.com" className="text-[#35d7f2]">support@kamikulture.com</a>.
        </p>
      </div>
    </div>
  );
}
