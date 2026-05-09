import { NextRequest, NextResponse } from 'next/server';

function decodeBasicAuth(header: string | null) {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = Buffer.from(header.split(' ')[1] ?? '', 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;

    return {
      user: decoded.slice(0, separator),
      pass: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isAdminRequest(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const expectedPass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  if (!expectedUser || !expectedPass) return false;

  const creds = decodeBasicAuth(req.headers.get('authorization'));
  return creds?.user === expectedUser && creds.pass === expectedPass;
}

export function adminUnauthorized(realm = 'Admin Area') {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}"`,
      'Cache-Control': 'no-store',
    },
  });
}
