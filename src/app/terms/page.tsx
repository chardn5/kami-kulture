export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern using Kami Kulture.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <div className="prose prose-invert prose-sm mt-6 max-w-none">
        <h2>Purchases</h2>
        <p>
          By placing an order you confirm that you are authorized to use the selected payment method.
          Orders may be canceled or refunded at our discretion if fraudulent or unavailable.
        </p>
        <h2>Intellectual Property</h2>
        <p>
          Artwork and content are owned by Kami Kulture. You may not reproduce or resell designs
          without written permission.
        </p>
        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Kami Kulture is not liable for indirect or
          consequential damages arising from use of the site.
        </p>
        <h2>Contact</h2>
        <p>
          For any questions email <a href="mailto:support@kamikulture.com">support@kamikulture.com</a>.
        </p>
      </div>
    </div>
  );
}
