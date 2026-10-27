function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function productThumbnail(slug: string, images: readonly string[]) {
  const models = new Map<string, Array<{ src: string; rank: number }>>();
  for (const src of new Set(images)) {
    let label: string;
    try { label = new URL(src).searchParams.get('camera_label') ?? ''; }
    catch { continue; }
    // Only whole-shirt model views: never a blank back, sleeve detail, or size chart.
    const match = /^person-(\d+)(?:-(front|context)(?:-\d+)?)?$/.exec(label);
    if (!match) continue;
    const key = match[1];
    const candidates = models.get(key) ?? [];
    candidates.push({ src, rank: match[2] === 'context' ? 1 : 0 });
    models.set(key, candidates);
  }
  const keys = [...models.keys()].sort();
  if (!keys.length) return images[0] || '/logo.png';
  // A slug seed keeps SSR, sorting, filtering, and repeat visits visually consistent.
  const key = keys[stableHash(slug) % keys.length];
  const candidates = models.get(key)!.sort((a, b) => a.rank - b.rank || a.src.localeCompare(b.src));
  const preferred = candidates.filter(candidate => candidate.rank === candidates[0].rank);
  return preferred[stableHash(`${slug}:color`) % preferred.length].src;
}
