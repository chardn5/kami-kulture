import { createHmac, timingSafeEqual } from "node:crypto";

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signCheckout<T>(value: T, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyCheckout<T extends { expiresAt: number }>(
  token: string,
  secret: string,
  now = Date.now(),
): T {
  if (typeof token !== "string" || token.length > 40000)
    throw new Error("QUOTE_INVALID");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("QUOTE_INVALID");
  const [payload, supplied] = parts;
  const expected = Buffer.from(signature(payload, secret));
  const received = Buffer.from(supplied);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  )
    throw new Error("QUOTE_INVALID");
  const quote = JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  if (!Number.isFinite(quote.expiresAt) || quote.expiresAt <= now)
    throw new Error("QUOTE_EXPIRED");
  return quote;
}

export type PayPalPayment = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
};

export function verifyCompletedPayment(
  payment: PayPalPayment,
  expected: { id: string; currency: string; total: number },
) {
  const units = payment.purchase_units;
  const unit = units?.[0];
  const captures = unit?.payments?.captures;
  const capture = captures?.[0];
  if (
    payment.status !== "COMPLETED" ||
    units?.length !== 1 ||
    unit?.custom_id !== expected.id ||
    captures?.length !== 1 ||
    capture?.status !== "COMPLETED" ||
    !capture.id
  )
    throw new Error("PAYMENT_NOT_COMPLETED");
  const amount = Number(capture.amount?.value);
  if (
    !Number.isFinite(amount) ||
    Math.round(amount * 100) !== Math.round(expected.total * 100) ||
    capture.amount?.currency_code !== expected.currency
  )
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  return capture.id;
}
