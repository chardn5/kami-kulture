import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const configSchema = z.object({
  id: z.string().uuid(),
  codeHash: z.string().regex(/^[a-f0-9]{64}$/),
  email: z.string().email(),
  sku: z.string().min(1),
  expiresAt: z.string().datetime(),
  environment: z.enum(['live', 'sandbox']),
});

export type PersonalOfferSnapshot = { id: string; retailSubtotal: number; discount: number };

export function personalOfferForCheckout(
  code: unknown,
  email: string,
  lines: ReadonlyArray<{ sku: string; qty: number }>,
  environment: string,
  config = process.env.PERSONAL_ORDER_OFFER,
  now = Date.now(),
) {
  if (code === undefined || code === '') return null;
  if (typeof code !== 'string' || code.length > 80) throw new Error('PERSONAL_OFFER_INVALID');
  let parsed: ReturnType<typeof configSchema.safeParse>;
  try { parsed = configSchema.safeParse(JSON.parse(config ?? '{}')); }
  catch { throw new Error('PERSONAL_OFFER_INVALID'); }
  if (!parsed.success) throw new Error('PERSONAL_OFFER_INVALID');
  const offer = parsed.data;
  const supplied = createHash('sha256').update(code.trim().toUpperCase()).digest();
  if (!timingSafeEqual(supplied, Buffer.from(offer.codeHash, 'hex')) || offer.environment !== environment)
    throw new Error('PERSONAL_OFFER_INVALID');
  if (Date.parse(offer.expiresAt) <= now) throw new Error('PERSONAL_OFFER_EXPIRED');
  if (email.trim().toLowerCase() !== offer.email.trim().toLowerCase()) throw new Error('PERSONAL_OFFER_EMAIL');
  if (lines.length !== 1 || lines[0].sku !== offer.sku || lines[0].qty !== 1) throw new Error('PERSONAL_OFFER_ITEM');
  return offer;
}

export function personalOfferPrice(cost: unknown, retail: number) {
  if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost <= 0 || cost > Math.round(retail * 100))
    throw new Error('PERSONAL_OFFER_COST');
  return cost / 100;
}

export async function claimPersonalOffer(
  orderId: string,
  offerId: string,
  update: (orderId: string, offerId: string) => Promise<{ count: number }>,
) {
  try {
    if ((await update(orderId, offerId)).count !== 1) throw new Error('PERSONAL_OFFER_USED');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      throw new Error('PERSONAL_OFFER_USED');
    throw error;
  }
}
