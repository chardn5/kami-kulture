"use client";
import { useState } from "react";
import { getGarment } from "@/data/garments";

export default function SizeChart({ slug, garmentKey }: { slug: string; garmentKey?: string }) {
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const garment = getGarment(slug, garmentKey);
  if (!garment) return null;
  const measure = (n: number) =>
    (unit === "cm" ? n * 2.54 : n)
      .toFixed(unit === "cm" ? 1 : 2)
      .replace(/\.00$/, "");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{garment.name}</h3>
          <p className="mt-1 text-sm text-[#f7f1df]/60">{garment.fit}</p>
        </div>
        <div
          role="group"
          aria-label="Measurement units"
          className="inline-flex rounded-md border border-white/20 p-1"
        >
          {(["in", "cm"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`kk-focus rounded px-3 py-1.5 text-xs font-bold ${unit === u ? "bg-[#f7f1df] text-black" : ""}`}
            >
              {u === "in" ? "Inches" : "Centimeters"}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          {garment.name} garment measurements in {unit}
        </caption>
        <thead>
          <tr className="border-y border-white/15 text-[#f7f1df]/65">
            <th className="py-3">Size</th>
            <th>Width ({unit})</th>
            <th>Length ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {garment.sizes.map(([s, w, l]) => (
            <tr key={s} className="border-b border-white/10">
              <th className="py-2.5 font-semibold">{s}</th>
              <td>{measure(w)}</td>
              <td>{measure(l)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-5 text-[#f7f1df]/60">
        Flat garment measurements, not body measurements. Allow up to{" "}
        {measure(garment.tolerance)} {unit} of manufacturing variation.
        Available sizes depend on the selected color.
      </p>
    </div>
  );
}
