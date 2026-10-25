import SizeChart from '@/components/SizeChart';
import Link from 'next/link';

export const metadata = { title: 'Size Guide', description: 'Garment-specific size charts in inches and centimeters for Kami Kulture tees.' };
export default function SizeGuidePage() {
  return <div className="kk-container max-w-3xl py-12">
    <p className="kk-eyebrow">Find your fit</p><h1 className="mt-2 text-3xl font-black">A better fit starts here.</h1>
    <p className="mt-4 text-sm leading-7 text-[#f7f1df]/65">Our designs use different shirts, so the same size can measure differently. Compare the chart for your design with a tee you already like.</p>
    <ol className="my-8 grid gap-5 border-y border-white/15 py-6 text-sm sm:grid-cols-3"><li><strong>1. Lay it flat</strong><p className="mt-2 leading-6 text-[#f7f1df]/60">Smooth out a well-fitting shirt without stretching it.</p></li><li><strong>2. Measure width</strong><p className="mt-2 leading-6 text-[#f7f1df]/60">Measure across the chest from underarm to underarm.</p></li><li><strong>3. Measure length</strong><p className="mt-2 leading-6 text-[#f7f1df]/60">Measure from the high shoulder near the collar to the bottom hem.</p></li></ol>
    <section id="powerover9000" className="scroll-mt-24 py-6"><Link href="/products/powerover9000" className="kk-focus mb-4 inline-block text-sm font-semibold text-[#35d7f2]">Power Level Over 9000</Link><SizeChart slug="powerover9000" /></section>
    <section id="sorryimlate" className="scroll-mt-24 border-t border-white/15 py-8"><Link href="/products/sorryimlate" className="kk-focus mb-4 inline-block text-sm font-semibold text-[#35d7f2]">Sorry I&apos;m late</Link><SizeChart slug="sorryimlate" /></section>
    <p className="mt-4 text-sm leading-7 text-[#f7f1df]/65">Prefer a looser fit? Compare the next size up. Sizes and colors shown on the product page reflect the available options. <Link href="/contact" className="text-[#35d7f2] underline">Ask us about fit</Link> before ordering.</p>
  </div>;
}
