import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminPageAccess } from '@/lib/adminPageAuth';
import { MANAGED_DESIGN_TAG, isApprovedDesign } from '@/lib/designMetadata';
import DesignReview from './DesignReview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Design review', robots: { index: false, follow: false } };

export default async function DesignsPage() {
  await requireAdminPageAccess('/admin/designs');
  const products = await prisma.product.findMany({
    where: { tags: { has: MANAGED_DESIGN_TAG } }, orderBy: { createdAt: 'asc' },
    include: { images: { orderBy: { position: 'asc' } }, variants: { where: { isEnabled: true } } },
  });
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6">
      <div><p className="text-xs font-bold uppercase text-[#d6ff57]">Admin</p><h1 className="mt-2 text-3xl font-black">Design review</h1></div>
      <Link className="kk-focus rounded-md border border-white/20 px-4 py-2 text-sm font-semibold" href="/admin/orders">Orders</Link>
    </header>
    <DesignReview designs={products.map(p => ({
      id: p.id, printifyId: p.printifyId, title: p.title, slug: p.slug, description: p.description ?? '',
      price: p.priceMinCents / 100, approved: isApprovedDesign(p),
      dpi: p.tags.find(t => t.startsWith('kami:dpi:'))?.slice(9) ?? '',
      width: p.tags.find(t => t.startsWith('kami:width:'))?.slice(11) ?? '',
      images: p.images.map(i => ({ url: i.url, variantIds: i.variantIds })),
      variants: p.variants.map(v => ({ id: v.variantId, color: v.color ?? '', size: v.size ?? '', available: v.isAvailable })),
    }))} />
  </main>;
}
