const buckets = new Map<string, { count: number; ts: number }>();

export function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || now - rec.ts > windowMs) {
    buckets.set(key, { count: 1, ts: now });
    return { ok: true };
  }
  if (rec.count >= max) return { ok: false };
  rec.count += 1;
  return { ok: true };
}
