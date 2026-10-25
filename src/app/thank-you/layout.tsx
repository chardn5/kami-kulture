import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Order Confirmation', robots: { index: false, follow: true } };
export default function ConfirmationLayout({ children }: { children: React.ReactNode }) { return children; }
