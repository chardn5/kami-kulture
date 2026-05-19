import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';
import { isAdminRequest } from '@/lib/adminRequestAuth';

export async function hasAdminApiAccess(req: NextRequest) {
  const cookieStore = await cookies();
  if (verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) return true;
  return isAdminRequest(req);
}
