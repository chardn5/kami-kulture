import { z } from 'zod';

export const PAYMENT_TEST_SKU = 'kami-live-payment-verification';
export const PAYMENT_TEST_TITLE = 'TEST ONLY - Do not purchase - Payment verification';
export const paymentTestContactSchema = z.object({
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export function hasPaymentTestItem(lines: ReadonlyArray<{ sku: string }>) {
  return lines.some(line => line.sku === PAYMENT_TEST_SKU);
}
