import { createHash } from 'crypto';

export function adminTokenFromPass(pass: string) {
  return createHash('sha256').update(pass).digest('base64url');
}

export function expectedAdminToken() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return null; // if not set, gating is disabled
  return adminTokenFromPass(pass);
}
