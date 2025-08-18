import Image from 'next/image';
import { designs } from '@/data/designs';

export const metadata = { title: 'Designs' };

export default function DesignsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Designs</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {designs.map(d => (
          <div key={d.id} className="group">
            <div className="relative aspect-square overflow-hidden rounded-2xl border">
              <Image src={d.mockups[0]} alt={d.name} fill className="object-contain bg-white" />
            </div>
            <h3 className="mt-3 text-sm font-medium">{d.name}</h3>
          </div>
        ))}
      </div>
    </main>
  );
}
