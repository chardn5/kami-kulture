import { z } from 'zod';

export const captureBodySchema = z.object({
  orderID: z.string().min(3),
  productTitle: z.string().optional(),
  productSlug: z.string().optional(),
  selectedSize: z.string().optional(),
  sku: z.string().optional(),
});

export type CaptureBody = z.infer<typeof captureBodySchema>;
