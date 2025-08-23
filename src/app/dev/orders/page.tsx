export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

import OrdersClient from './OrdersClient';

export default function Page() {
  return <OrdersClient />;
}
