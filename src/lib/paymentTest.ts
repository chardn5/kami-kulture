import { z } from 'zod';

export const PAYMENT_TEST_SKU = 'kami-live-payment-verification';
export const PAYMENT_TEST_TITLE = 'TEST ONLY - Do not purchase - Payment verification';
export const paymentTestContactSchema = z.object({
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export const PAYMENT_TEST_DESCRIPTION = 'Payment verification only. Nothing will be produced or shipped, and this order will never be sent to Printify.';

export function hasPaymentTestItem(lines: ReadonlyArray<{ sku?: string | null }>) {
  return lines.some(line => line.sku === PAYMENT_TEST_SKU);
}
