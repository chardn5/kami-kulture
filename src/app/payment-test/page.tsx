import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaymentTest from './PaymentTest';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Test only - Do not purchase',
  robots: { index: false, follow: false },
};

export default function PaymentTestPage() {
  if (process.env.PAYMENT_TEST_ENABLED !== 'true') notFound();
  return <PaymentTest />;
}
