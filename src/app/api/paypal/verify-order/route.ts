// src/app/api/paypal/verify-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailOrderJSON } from '@/lib/email';
import { showOrder } from '@/lib/paypal';

export const runtime = 'nodejs';

// Minimal shapes we actually read from PayPal
interface PayPalAmount {
  currency_code?: string;
  value?: string;
}

interface PayPalCapture {
  amount?: PayPalAmount;
}

interface PayPalPayments {
  captures?: PayPalCapture[];
}

interface PayPalPurchaseUnit {
  amount?: PayPalAmount;
  payee?: { email_address?: string };
  payments?: PayPalPayments;
}

interface PayPalOrder {
  id: string;
  status?: string;
  payer?: { email_address?: string };
  purchase_units?: PayPalPurchaseUnit[];
}


function pick<T>(v: unknown, path: (string | number)[], fallback?: T): T | undefined {
  let cur: unknown = v;
  for (const key of path) {
    if (cur == null) return fallback;
    if (typeof key === 'number') {
      if (Array.isArray(cur)) {
        cur = (cur as unknown[])[key];
      } else {
        return fallback;
      }
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }
  return (cur as T) ?? fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.orderId || body?.orderID;
    const expectedAmount: number | undefined = body?.expectedAmount;
    const meta = body?.meta || {};

    if (!orderId) {
      return NextResponse.json({ ok: false, error: 'Missing orderId' }, { status: 400 });
    }

    console.log('VERIFY_ORDER_START', { orderId, expectedAmount, meta });

    const raw = await showOrder(orderId);
    const order = raw as PayPalOrder;

    // Sanity: ensure this is the same ORDER we asked for
    if (!order?.id || order.id !== orderId) {
      throw new Error('Fetched object is not an Order or ID mismatch');
    }

    const status: string | undefined = order?.status; // expect "COMPLETED" after capture
    const payerEmail: string | undefined =
      order?.payer?.email_address ||
      pick(order, ['purchase_units', 0, 'payee', 'email_address']);

  const pu = order.purchase_units?.[0];
const capture = pu?.payments?.captures?.[0];

const capturedValueStr = capture?.amount?.value;
const currency =
  capture?.amount?.currency_code ??
  pu?.amount?.currency_code ??
  'USD';


    let amountOk = true;
    if (expectedAmount != null && capturedValueStr != null) {
      amountOk = Number(capturedValueStr).toFixed(2) === Number(expectedAmount).toFixed(2);
    }

    console.log('VERIFY_ORDER_OK', { orderId, status, amountOk, currency, capturedValueStr });

    const html = `
      <h2>Thanks for your order!</h2>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Status:</strong> ${status ?? '(n/a)'}</p>
      <p><strong>Amount:</strong> ${currency} ${capturedValueStr ?? '(n/a)'}</p>
      ${meta?.productTitle ? `<p><strong>Product:</strong> ${meta.productTitle}${meta?.selectedSize ? ` (Size: ${meta.selectedSize})` : ''}</p>` : ''}
      ${meta?.sku ? `<p><strong>SKU:</strong> ${meta.sku}</p>` : ''}
      ${meta?.customId ? `<p><strong>Custom ID:</strong> ${meta.customId}</p>` : ''}
      <p>We’ll email you again once the order ships. If you didn’t place this order, contact support@kamikulture.com.</p>
    `;

    const recipients = [payerEmail, process.env.ORDER_TO_EMAIL || 'orders@kamikulture.com']
      .filter(Boolean) as string[];

    const emailSubject = `Order Confirmation – ${orderId}`;
    const emailPayload = {
      paypalOrderStatus: status,
      paypalOrderId: orderId,
      currency,
      capturedValue: capturedValueStr,
      amountOk,
      meta,
    };

    const emailResult = await emailOrderJSON(emailSubject, emailPayload, {
      to: recipients,
      html,
    });

    if (!emailResult.ok) {
      console.error('RESEND_FAILED', emailResult);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      status,
      amountOk,
      email: emailResult.ok ? 'sent' : 'failed',
    });
  } catch (err: any) {
    console.error('VERIFY_ORDER_ERROR', err?.message || err, err?.stack);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
