const faqs = [
  {
    question: "Are the designs official anime merchandise?",
    answer:
      "No. Kami Kulture designs are original anime-inspired artwork and phrases. They are not official merchandise from anime studios, publishers, or licensors.",
  },
  {
    question: "When will my order ship?",
    answer:
      "Items are printed on demand, so production usually takes 3-7 business days before shipping. Tracking appears once the carrier provides it.",
  },
  {
    question: "Can I change my address after ordering?",
    answer:
      "Contact support as soon as possible. If production has not started, we will try to update the order. Once production starts, address changes may no longer be possible.",
  },
  {
    question: "Do you accept returns?",
    answer:
      "Defective, damaged, misprinted, or incorrect items can be reviewed within 30 days of delivery. Because items are printed after purchase, size exchanges and preference returns are handled case by case.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Use the Track Order page with your order ID and checkout email. Tracking details will appear there after the fulfillment partner provides them.",
  },
];

export const metadata = {
  title: "FAQ",
  description: "Common Kami Kulture questions about orders, shipping, returns, and designs.",
};

export default function FaqPage() {
  return (
    <main className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#d6ff57]">Help center</p>
      <h1 className="mt-2 text-3xl font-black">FAQ</h1>
      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <section key={faq.question} className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5">
            <h2 className="text-lg font-black">{faq.question}</h2>
            <p className="mt-2 text-sm leading-6 text-[#f7f1df]/66">{faq.answer}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
