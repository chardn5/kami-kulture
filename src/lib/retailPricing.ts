export const RETAIL_PRICES_CENTS: Record<string, number> = {
  S: 3499, M: 3499, L: 3499, XL: 3499,
  '2XL': 3699, '3XL': 3999, '4XL': 4499, '5XL': 4499,
};

export function retailPriceCents(size?: string | null) {
  const normalized = (size ?? '').trim().toUpperCase().replace(/^XXL$/, '2XL').replace(/^XXXL$/, '3XL');
  const price = RETAIL_PRICES_CENTS[normalized];
  if (!price) throw new Error(`UNSUPPORTED_RETAIL_SIZE:${normalized}`);
  return price;
}
