import type { PayPalPayment } from "./checkoutSecurity";

export function paypalEnvironment() {
  return ["live", "production"].includes(process.env.PAYPAL_ENV ?? "")
    ? "live"
    : "sandbox";
}

export function checkoutSigningSecret() {
  const secret =
    process.env.CHECKOUT_SIGNING_SECRET ||
    process.env.PAYPAL_CLIENT_SECRET ||
    process.env.PAYPAL_SECRET;
  if (!secret) throw new Error("PAYPAL_CREDENTIALS_MISSING");
  return secret;
}

export async function paypalRequest<T = PayPalPayment>(
  path: string,
  method = "GET",
  payload?: unknown,
  requestId?: string,
): Promise<T> {
  const id =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CREDENTIALS_MISSING");
  const base =
    paypalEnvironment() === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!tokenResponse.ok) throw new Error("PAYPAL_UNAVAILABLE");
  const { access_token } = await tokenResponse.json();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(payload ?? {}) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    console.error("[paypal] request failed", path, response.status);
    throw new Error("PAYPAL_REQUEST_FAILED");
  }
  return response.json() as Promise<T>;
}
