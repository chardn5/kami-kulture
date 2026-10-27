function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function productThumbnail(slug: string, images: readonly string[]) {
  const shirts: Array<{ src: string; rank: number }> = [];
  for (const src of new Set(images)) {
    let label: string;
    try {
      const url = new URL(src, 'https://kamikulture.com');
      label = url.searchParams.get('camera_label')
        ?? decodeURIComponent(url.pathname.split('/').at(-1) ?? '').replace(/\.[^.]+$/, '').toLowerCase();
    }
    catch { continue; }
    // Prefer a full front view; model photos remain in the untouched gallery.
    if (/^front(?:-\d+)?$/.test(label)) shirts.push({ src, rank: label === 'front' ? 0 : 1 });
    else if (/^folded(?:-\d+)?$/.test(label)) shirts.push({ src, rank: 2 });
  }
  if (!shirts.length) return images[0] || '/logo.png';
  shirts.sort((a, b) => a.rank - b.rank || a.src.localeCompare(b.src));
  const preferred = shirts.filter(candidate => candidate.rank === shirts[0].rank);
  // Keep the displayed shirt color stable across sorting, filtering, and reloads.
  return preferred[stableHash(`${slug}:color`) % preferred.length].src;
}
