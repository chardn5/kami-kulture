import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';
import { isAdminRequest } from '@/lib/adminRequestAuth';
import { isSameOriginRequest } from '@/lib/requestOrigin';

export async function hasAdminApiAccess(req: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (origin && !isSameOriginRequest(req)) return false;
  }
  const cookieStore = await cookies();
  if (verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) return true;
  return isAdminRequest(req);
}
