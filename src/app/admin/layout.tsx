import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';
import AdminNavigation from './AdminNavigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = verifyAdminSessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  return <div className="admin-workspace">{signedIn ? <AdminNavigation /> : null}{children}</div>;
}
