export function isSameOriginRequest(req: { headers: Headers; url: string }) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(req.url);
    const host = req.headers.get('host') || target.host;
    const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || target.protocol.replace(':', '');
    return source.host === host && source.protocol === `${protocol}:` && !source.username && !source.password;
  } catch { return false; }
}
