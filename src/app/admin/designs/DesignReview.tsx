'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, RefreshCw, Check, EyeOff } from 'lucide-react';
import SizeChart from '@/components/SizeChart';

type Design = {
  id: string; printifyId: string; title: string; slug: string; description: string;
  price: number; approved: boolean; dpi: string; width: string;
  images: { url: string; variantIds: number[] }[];
  variants: { id: number; color: string; size: string; available: boolean }[];
};
const swatches: Record<string, string> = { Graphite: '#454545', Ivory: '#f4f0df', 'China Blue': '#5d7e96' };

export default function DesignReview({ designs }: { designs: Design[] }) {
  const [selected, setSelected] = useState(designs[0]?.id ?? '');
  const [color, setColor] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const [approval, setApproval] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const design = designs.find(d => d.id === selected);
  if (!design) return <p className="py-12 text-white/65">No designs awaiting review.</p>;
  const colors = Array.from(new Set(design.variants.map(v => v.color)));
  const activeColor = colors.includes(color) ? color : colors[0];
  const variants = design.variants.filter(v => v.color === activeColor);
  const ids = new Set(variants.map(v => v.id));
  const images = design.images.filter(i => !i.variantIds.length || i.variantIds.some(id => ids.has(id)));
  const image = images[imageIndex % Math.max(1, images.length)];
  const published = approval[design.id] ?? design.approved;
  async function update(approved: boolean) {
    if (!design || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/designs/${design.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update design.');
      setApproval(previous => ({ ...previous, [design.id]: approved }));
      setMessage(approved ? 'Published to the store.' : 'Removed from the public store.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update design.'); }
    finally { setBusy(false); }
  }
  return <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
    <nav aria-label="Designs" className="flex gap-2 overflow-x-auto border-b border-white/15 pb-4 lg:flex-col lg:border-b-0 lg:border-r lg:pr-5">
      {designs.map(d => <button key={d.id} disabled={busy} aria-current={selected === d.id ? 'true' : undefined} onClick={() => { setSelected(d.id); setColor(''); setImageIndex(0); setMessage(''); }} className={`kk-focus shrink-0 rounded-md border p-3 text-left text-sm font-semibold lg:w-full ${selected === d.id ? 'border-[#d6ff57] bg-[#d6ff57]/10' : 'border-white/15'}`}>
        {d.title}<span className="mt-1 block text-xs font-normal text-white/60">{(approval[d.id] ?? d.approved) ? 'Published' : 'Draft'}</span>
      </button>)}
    </nav>
    <section className="min-w-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className={`text-xs font-bold uppercase ${published ? 'text-[#d6ff57]' : 'text-[#ff8993]'}`}>{published ? 'Published' : 'Unpublished draft'}</p><h2 className="mt-2 text-2xl font-bold">{design.title}</h2><p className="mt-1 text-sm text-white/60">Comfort Colors 1717 · ${design.price.toFixed(2)}</p></div>
        <button disabled={busy || (!published && !design.variants.some(v => v.available))} onClick={() => update(!published)} className="kk-focus inline-flex min-h-11 items-center gap-2 rounded-md bg-[#d6ff57] px-4 text-sm font-bold text-black disabled:opacity-50">
          {busy ? <RefreshCw size={16} className="animate-spin" /> : published ? <EyeOff size={16} /> : <Check size={16} />}{busy ? 'Updating...' : published ? 'Unpublish' : 'Approve & publish'}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mb-4 min-h-5 text-sm text-[#d6ff57]">{message}</p>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(240px,1fr)]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden bg-white">
            {image ? <Image unoptimized src={image.url} alt={`${design.title} on ${activeColor}, mockup ${imageIndex + 1}`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" /> : <p className="p-8 text-black">Mockups pending</p>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" title="Previous mockup" aria-label="Previous mockup" disabled={images.length < 2} className="kk-focus flex h-10 w-10 items-center justify-center rounded-md border border-white/20 disabled:opacity-40" onClick={() => setImageIndex((imageIndex + images.length - 1) % images.length)}><ChevronLeft size={18} /></button>
            <span className="text-xs text-white/60">{images.length ? imageIndex + 1 : 0} / {images.length}</span>
            <button type="button" title="Next mockup" aria-label="Next mockup" disabled={images.length < 2} className="kk-focus flex h-10 w-10 items-center justify-center rounded-md border border-white/20 disabled:opacity-40" onClick={() => setImageIndex((imageIndex + 1) % images.length)}><ChevronRight size={18} /></button>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {images.map((i, index) => <button key={`${i.url}-${index}`} aria-label={`View mockup ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)} className={`kk-focus relative aspect-square overflow-hidden rounded border-2 bg-white ${index === imageIndex ? 'border-[#d6ff57]' : 'border-transparent'}`}><Image unoptimized src={i.url} alt="" fill sizes="100px" className="object-contain" /></button>)}
          </div>
        </div>
        <div className="min-w-0">
          <fieldset><legend className="mb-3 text-sm font-bold">Color: {activeColor}</legend><div className="flex flex-wrap gap-2">{colors.map(c => <button key={c} title={c} aria-label={c} aria-pressed={c === activeColor} onClick={() => { setColor(c); setImageIndex(0); }} className={`kk-focus h-10 w-10 rounded-full border-2 ${c === activeColor ? 'border-[#d6ff57]' : 'border-white/25'}`} style={{ backgroundColor: swatches[c] ?? '#888' }} />)}</div></fieldset>
          <h3 className="mb-3 mt-6 text-sm font-bold">Sizes</h3><div className="flex flex-wrap gap-2">{variants.map(v => <span key={v.id} className={`min-w-10 rounded border border-white/20 px-2 py-2 text-center text-xs ${!v.available ? 'text-white/35 line-through' : ''}`} title={v.available ? 'Available' : 'Unavailable'}>{v.size}</span>)}</div>
          <p className="mt-6 text-sm leading-6 text-white/70">{design.description}</p>
          <dl className="mt-6 border-y border-white/15 py-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-white/60">Front print</dt><dd>{design.width} in wide</dd></div><div className="mt-2 flex justify-between gap-3"><dt className="text-white/60">Source resolution</dt><dd>{design.dpi} DPI</dd></div></dl>
          <p className="mt-3 break-all text-xs text-white/45">Printify ID: {design.printifyId}</p>
          {published && <Link className="kk-focus mt-4 inline-block text-sm font-semibold underline" href={`/products/${design.slug}`}>View in store</Link>}
          <details className="mt-6 border-t border-white/15 pt-4"><summary className="kk-focus cursor-pointer text-sm font-semibold">Size chart</summary><div className="mt-4"><SizeChart slug={design.slug} garmentKey="comfort-colors-1717" /></div></details>
        </div>
      </div>
    </section>
  </div>;
}
