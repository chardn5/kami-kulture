export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

import LoginClient from './LoginClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { expectedAdminToken } from '@/lib/adminAuth';

export default async function Page() {
  const expected = expectedAdminToken();
  if (expected) {
    const cookieStore = await cookies();
    const token = cookieStore.get('kk_admin')?.value ?? null;
    if (token === expected) redirect('/dev/orders');
  }
  return <LoginClient />;
}
