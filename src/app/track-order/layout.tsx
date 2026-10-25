import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Track Order', robots: { index: false, follow: true } };
export default function TrackingLayout({ children }: { children: React.ReactNode }) { return children; }
