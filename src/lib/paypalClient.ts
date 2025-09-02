// src/lib/paypalClient.ts
// Client-only helper to load the PayPal JS SDK with consistent params.
type PayPalSDK = {
  Buttons: (opts: any) => any;
  FUNDING: { PAYPAL: unknown; CARD: unknown };
};
type WindowWithPaypal = Window & { paypal?: PayPalSDK };

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

function buildSdkSrc(clientId: string) {
  const base = 'https://www.paypal.com/sdk/js';
  const params =
    `components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=${encodeURIComponent(CURRENCY)}&intent=capture&enable-funding=card`;
  return `${base}?${params}`;
}

/** Load (or reload) the PayPal SDK with the desired params.
 * If another SDK with different params exists, remove it and inject the correct one.
 */
export async function loadPayPalSDK(): Promise<PayPalSDK> {
  if (typeof window === 'undefined') throw new Error('loadPayPalSDK must run on the client');

  const w = window as WindowWithPaypal;
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID not set');

  const desiredSrc = buildSdkSrc(clientId);

  // Find any paypal sdk scripts
  const existing = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]')
  );
  const exact = existing.find((s) => s.src === desiredSrc);

  // If wrong/missing params, remove them so we can inject the correct one
  if (!exact && existing.length) {
    existing.forEach((s) => s.parentElement?.removeChild(s));
    // reset global to force re-init
    (w as any).paypal = undefined;
  }

  // Already present with correct params
  if (exact) {
    if (w.paypal) return w.paypal;
    await new Promise<void>((res, rej) => {
      exact.addEventListener('load', () => res(), { once: true });
      exact.addEventListener('error', () => rej(new Error('Failed loading PayPal SDK')), { once: true });
    });
    if (!w.paypal) throw new Error('PayPal SDK not ready after script load');
    return w.paypal!;
  }

  // Inject fresh
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = desiredSrc;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(el);
  });

  if (!w.paypal) throw new Error('PayPal SDK loaded but window.paypal is undefined');
  return w.paypal!;
}
