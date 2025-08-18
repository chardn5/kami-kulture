// /app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/paypal'; // or however you obtain tokens

const PP_BASE = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = (body?.title as string) || 'Kami Tee';
    const amountNum = Number(body?.amount) || 29;
    const currency = (body?.currency as string) || 'USD';
    const qty = Number(body?.qty) || 1;
    const sku = (body?.product as string) || 'kami-tee';

    const token = await getAccessToken();

    const createRes = await fetch(`${PP_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            items: [
              {
                name: title,
                sku,
                unit_amount: { currency_code: currency, value: amountNum.toFixed(2) },
                quantity: String(qty),
              },
            ],
            amount: {
              currency_code: currency,
              value: (amountNum * qty).toFixed(2),
              breakdown: {
                item_total: { currency_code: currency, value: (amountNum * qty).toFixed(2) },
              },
            },
          },
        ],
      }),
    });

    const json = await createRes.json();
    if (!createRes.ok) {
      console.error('PAYPAL_CREATE_FAIL', json);
      return NextResponse.json({ ok: false, error: 'CREATE_FAILED' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: json.id });
  } catch (e) {
    console.error('/api/paypal/create-order', e);
    return NextResponse.json({ ok: false, error: 'CREATE_FAILED' }, { status: 500 });
  }
}
