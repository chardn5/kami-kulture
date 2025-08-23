export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

import LoginClient from './LoginClient';

export default function Page() {
  return <LoginClient />;
}
