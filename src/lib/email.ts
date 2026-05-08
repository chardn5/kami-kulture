// src/lib/email.ts
import 'server-only';

/** ---------- Utilities ---------- */
function parseRecipients(v?: string): string | string[] {
  if (!v) return 'orders@kamikulture.com';
  const list = v.split(',').map(s => s.trim()).filter(Boolean);
  return list.length > 1 ? list : list[0];
}

function cleanFrom(v?: string): string {
  // Trim + strip any leading/trailing single/double quotes
  const raw = (v || '').trim().replace(/^['"]+|['"]+$/g, '');
  // Normalize to either "Name <email@domain>" or "email@domain"
  const m = raw.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (m) {
    const name = m[1].trim();
    const email = m[2].trim();
    return name ? `${name} <${email}>` : email;
  }
  return raw || 'orders@kamikulture.com';
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function money(n: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
}

async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  bcc?: string | string[];
}) {
  const from = cleanFrom(process.env.EMAIL_FROM) || 'orders@kamikulture.com';
  const key = process.env.RESEND_API_KEY;

  // Dev fallback: don’t throw in local if key is missing—just log.
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing. NO-OP send.', {
      to: params.to,
      subject: params.subject,
    });
    return { ok: true, id: 'dev-noop' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[email] Resend error', res.status, body);
    return { ok: false, status: res.status, body };
  }
  return { ok: true, id: body?.id };
}

/** ---------- Existing low-level helper (kept) ---------- */
export async function emailOrderJSON(
  subject: string,
  json: unknown,
  opts?: { to?: string | string[]; html?: string }
) {
  const to = opts?.to ?? parseRecipients(process.env.ORDER_TO_EMAIL);
  const html =
    opts?.html || `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; line-height: 1.4; white-space: pre-wrap; color: #e5e7eb; background:#0b0f19; padding:12px; border-radius:8px;">
${escapeHtml(JSON.stringify(json, null, 2))}
</pre>`;
  const text = JSON.stringify(json, null, 2);

  return sendEmail({ to, subject, html, text });
}

/** ---------- New: Customer receipt ---------- */
export type ReceiptItem = {
  title: string;
  qty: number;
  unitPrice: number; // major units (e.g., 499.00). If you store cents, convert /100 before passing
  size?: string;
  color?: string;
  sku?: string;
  image?: string;
};

export type ReceiptPayload = {
  to: string;
  orderNumber: string;
  currency?: string;       // default 'USD'
  locale?: string;         // default 'en-US'
  customerName?: string;   // e.g., "Richard"
  items: ReceiptItem[];
  subtotal: number;        // major units
  shipping?: number;       // default 0
  tax?: number;            // default 0
  total: number;           // major units
  trackUrl?: string;       // e.g., `${process.env.NEXT_PUBLIC_SITE_URL}/track?order=...`
};

function itemOptionText(i: Pick<ReceiptItem, 'color' | 'size'>, separator = ', ') {
  return [
    i.color ? `Color: ${i.color}` : '',
    i.size ? `Size: ${i.size}` : '',
  ].filter(Boolean).join(separator);
}

function itemOptionHtml(i: Pick<ReceiptItem, 'color' | 'size'>, separator = ', ') {
  return [
    i.color ? `Color: ${escapeHtml(i.color)}` : '',
    i.size ? `Size: ${escapeHtml(i.size)}` : '',
  ].filter(Boolean).join(separator);
}

function renderReceiptHTML(p: ReceiptPayload) {
  const currency = p.currency || 'USD';
  const locale = p.locale || (currency === 'PHP' ? 'en-PH' : 'en-US');

  const rows = p.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;vertical-align:top">
          <div style="font-weight:600;color:#fff">${escapeHtml(i.title)}</div>
          <div style="font-size:12px;color:#9ca3af">
            ${[
              itemOptionHtml(i, ' / '),
              i.sku ? `SKU: ${escapeHtml(i.sku)}` : '',
            ].filter(Boolean).join(' · ')}
          </div>
        </td>
        <td style="padding:8px 0;text-align:center;color:#e5e7eb">${i.qty}</td>
        <td style="padding:8px 0;text-align:right;color:#e5e7eb">${money(i.unitPrice, currency, locale)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="background:#0b0f19;padding:24px;border-radius:16px;color:#e5e7eb;font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
    <h1 style="margin:0 0 8px 0;color:#fff;font-size:18px;">Thanks for your order${p.customerName ? `, ${escapeHtml(p.customerName)}` : ''}!</h1>
    <p style="margin:0 0 16px 0;color:#9ca3af;">Order #: <strong style="color:#fff">${escapeHtml(p.orderNumber)}</strong></p>

    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="border-bottom:1px solid #1f2937;color:#9ca3af;">
          <th style="text-align:left;padding:8px 0;font-weight:500;">Item</th>
          <th style="text-align:center;padding:8px 0;font-weight:500;">Qty</th>
          <th style="text-align:right;padding:8px 0;font-weight:500;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="border-top:1px solid #1f2937;margin-top:12px;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;margin:6px 0;">
        <span style="color:#9ca3af">Subtotal</span>
        <span>${money(p.subtotal, currency, locale)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin:6px 0;">
        <span style="color:#9ca3af">Shipping</span>
        <span>${money(p.shipping ?? 0, currency, locale)}</span>
      </div>
      ${typeof p.tax === 'number' ? `
      <div style="display:flex;justify-content:space-between;margin:6px 0;">
        <span style="color:#9ca3af">Tax</span>
        <span>${money(p.tax ?? 0, currency, locale)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;margin:8px 0;font-weight:700;color:#fff;">
        <span>Total</span>
        <span>${money(p.total, currency, locale)}</span>
      </div>
    </div>

    ${
      p.trackUrl
        ? `<p style="margin-top:16px;"><a href="${escapeHtml(
            p.trackUrl
          )}" style="background:#34d399;color:#000;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600;">Track your order</a></p>`
        : ''
    }

    <p style="margin-top:16px;color:#9ca3af;">Questions? Reply to this email and we’ll help you out.</p>
  </div>`;
}

function renderReceiptText(p: ReceiptPayload) {
  const currency = p.currency || 'USD';
  const locale = p.locale || (currency === 'PHP' ? 'en-PH' : 'en-US');

  const lines = p.items
    .map(
      (i) => {
        const options = itemOptionText(i);
        return `- ${i.title}${options ? ` (${options})` : ''} x${i.qty} @ ${money(i.unitPrice, currency, locale)}`;
      }
    )
    .join('\n');

  return `Thanks for your order${p.customerName ? `, ${p.customerName}` : ''}!
Order #: ${p.orderNumber}

Items:
${lines}

Subtotal: ${money(p.subtotal, currency, locale)}
Shipping: ${money(p.shipping ?? 0, currency, locale)}
${typeof p.tax === 'number' ? `Tax: ${money(p.tax ?? 0, currency, locale)}\n` : ''}Total: ${money(
    p.total,
    currency,
    locale
  )}

${p.trackUrl ? `Track your order: ${p.trackUrl}\n\n` : ''}Questions? Reply to this email.`;
}

export async function sendOrderReceipt(p: ReceiptPayload) {
  const subject = `Your Kami Kulture order ${p.orderNumber}`;
  const html = renderReceiptHTML(p);
  const text = renderReceiptText(p);
  return sendEmail({ to: p.to, subject, html, text });
}

/** ---------- New: Admin notification (optional raw JSON) ---------- */
export async function notifyAdminNewOrder(p: {
  orderNumber: string;
  currency?: string;
  locale?: string;
  customerEmail?: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  items?: ReceiptItem[];
  raw?: unknown;     // e.g., full PayPal capture JSON or your order row
  to?: string | string[]; // override; otherwise uses ORDER_TO_EMAIL
}) {
  const to = p.to ?? parseRecipients(process.env.ORDER_TO_EMAIL);
  const currency = p.currency || 'USD';
  const locale = p.locale || (currency === 'PHP' ? 'en-PH' : 'en-US');

  const summaryRows =
    p.items?.map(
      i => `<tr><td style="padding:4px 0;color:#e5e7eb">${escapeHtml(i.title)} ${itemOptionHtml(i, ' / ') ? `(${itemOptionHtml(i, ' / ')})` : ''}</td>
        <td style="padding:4px 0;text-align:center;color:#9ca3af">${i.qty}</td>
        <td style="padding:4px 0;text-align:right;color:#9ca3af">${money(i.unitPrice, currency, locale)}</td></tr>`
    ).join('') ?? '';

  const rawJson = p.raw
    ? JSON.stringify(
        p.raw,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    : '';

  const html = `
    <div style="background:#0b0f19;padding:16px;border-radius:12px;color:#e5e7eb;font-family:ui-sans-serif,system-ui">
      <h2 style="margin:0 0 8px 0;color:#fff;">New order: ${escapeHtml(p.orderNumber)}</h2>
      <p style="margin:0 0 12px 0;color:#9ca3af;">Customer: ${escapeHtml(p.customerEmail ?? 'Unknown')}</p>
      ${
        summaryRows
          ? `<table style="width:100%;border-collapse:collapse;margin:6px 0">
              <thead><tr style="border-bottom:1px solid #1f2937;color:#9ca3af">
                <th style="text-align:left;padding:6px 0">Item</th>
                <th style="text-align:center;padding:6px 0">Qty</th>
                <th style="text-align:right;padding:6px 0">Price</th>
              </tr></thead>
              <tbody>${summaryRows}</tbody>
            </table>`
          : ''
      }
      <div style="border-top:1px solid #1f2937;margin-top:10px;padding-top:10px">
        ${typeof p.subtotal === 'number' ? `<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(p.subtotal, currency, locale)}</span></div>` : ''}
        ${typeof p.shipping === 'number' ? `<div style="display:flex;justify-content:space-between"><span>Shipping</span><span>${money(p.shipping, currency, locale)}</span></div>` : ''}
        ${typeof p.tax === 'number' ? `<div style="display:flex;justify-content:space-between"><span>Tax</span><span>${money(p.tax, currency, locale)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:700;color:#fff;margin-top:6px"><span>Total</span><span>${money(p.total, currency, locale)}</span></div>
      </div>
      ${
        p.raw
          ? `<pre style="margin-top:12px;background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; white-space:pre-wrap;">${escapeHtml(
              rawJson
            )}</pre>`
          : ''
      }
    </div>
  `;

  const text = `New order ${p.orderNumber}
Customer: ${p.customerEmail ?? 'Unknown'}
Total: ${money(p.total, currency, locale)}
${p.items?.map(i => {
  const options = itemOptionText(i);
  return `- ${i.title}${options ? ` (${options})` : ''} x${i.qty} @ ${money(i.unitPrice, currency, locale)}`;
}).join('\n') ?? ''}

${p.raw ? `\nRAW:\n${rawJson}` : ''}`;

  return sendEmail({
    to,
    subject: `[ADMIN] New order ${p.orderNumber}`,
    html,
    text,
  });
}
