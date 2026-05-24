const rows = [
  ["S", "18", "28"],
  ["M", "20", "29"],
  ["L", "22", "30"],
  ["XL", "24", "31"],
  ["2XL", "26", "32"],
] as const;

export const metadata = {
  title: "Size Guide",
  description: "Approximate unisex tee measurements for Kami Kulture shirts.",
};

export default function SizeGuidePage() {
  return (
    <main className="kk-container max-w-3xl py-12 text-[#f7f1df]">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Fit notes</p>
      <h1 className="mt-2 text-3xl font-black">Size Guide</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f7f1df]/64">
        Current tees use a standard unisex fit. Measurements are approximate and can vary
        by production partner, garment color, and batch.
      </p>

      <section className="mt-8 overflow-hidden rounded-lg border border-[#f7f1df]/12 bg-[#171711]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-black/22 text-xs uppercase text-[#f7f1df]/48">
            <tr>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Width in</th>
              <th className="px-4 py-3">Length in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([size, width, length]) => (
              <tr key={size} className="border-t border-[#f7f1df]/10">
                <td className="px-4 py-3 font-black">{size}</td>
                <td className="px-4 py-3 text-[#f7f1df]/72">{width}</td>
                <td className="px-4 py-3 text-[#f7f1df]/72">{length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-5 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5 text-sm leading-6 text-[#f7f1df]/66">
        <p className="font-semibold text-[#f7f1df]">How to choose</p>
        <p className="mt-2">
          Measure a shirt you already like from armpit to armpit for width and from collar
          to hem for length. If you prefer a looser streetwear fit, choose one size up.
        </p>
      </div>
    </main>
  );
}
