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

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, '&quot;');
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

  // Dev fallback: do not throw locally if the key is missing.
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
        <td style="padding:14px 0;vertical-align:top;border-bottom:1px solid #1f2937;">
          <div style="font-weight:700;color:#ffffff;font-size:15px;line-height:20px;">${escapeHtml(i.title)}</div>
          <div style="font-size:12px;line-height:18px;color:#9ca3af;margin-top:3px;">
            ${[
              itemOptionHtml(i, ' / '),
              i.sku ? `SKU: ${escapeHtml(i.sku)}` : '',
            ].filter(Boolean).join(' | ')}
          </div>
        </td>
        <td style="padding:14px 8px;text-align:center;color:#e5e7eb;border-bottom:1px solid #1f2937;">${i.qty}</td>
        <td style="padding:14px 0;text-align:right;color:#e5e7eb;border-bottom:1px solid #1f2937;white-space:nowrap;">${money(i.unitPrice, currency, locale)}</td>
      </tr>`
    )
    .join('');

  const totalRows = [
    ['Subtotal', money(p.subtotal, currency, locale), false],
    ['Shipping', money(p.shipping ?? 0, currency, locale), false],
    ...(typeof p.tax === 'number' ? [['Tax', money(p.tax ?? 0, currency, locale), false] as const] : []),
    ['Total', money(p.total, currency, locale), true],
  ]
    .map(([label, value, strong]) => `
      <tr>
        <td style="padding:${strong ? '10px 0 0' : '6px 0'};color:${strong ? '#ffffff' : '#9ca3af'};font-weight:${strong ? '800' : '500'};">${label}</td>
        <td style="padding:${strong ? '10px 0 0' : '6px 0'};text-align:right;color:#ffffff;font-weight:${strong ? '800' : '500'};white-space:nowrap;">${value}</td>
      </tr>`)
    .join('');

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial, Helvetica, sans-serif;color:#e5e7eb;">
    <tr>
      <td align="center" style="padding:18px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#0b0f19;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 26px 16px;">
              <div style="color:#d6ff57;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Order confirmed</div>
              <h1 style="margin:8px 0 8px;color:#ffffff;font-size:24px;line-height:30px;">Thanks for your order${p.customerName ? `, ${escapeHtml(p.customerName)}` : ''}!</h1>
              <p style="margin:0;color:#9ca3af;font-size:14px;line-height:22px;">Order #: <strong style="color:#ffffff">${escapeHtml(p.orderNumber)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <thead>
                  <tr>
                    <th align="left" style="padding:10px 0;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Item</th>
                    <th align="center" style="padding:10px 8px;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Qty</th>
                    <th align="right" style="padding:10px 0;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Price</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 26px 6px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${totalRows}
              </table>
            </td>
          </tr>
          ${
            p.trackUrl
              ? `<tr>
                  <td style="padding:18px 26px 8px;">
                    <a href="${escapeAttr(p.trackUrl)}" style="display:inline-block;background:#d6ff57;color:#000000;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:800;">Track your order</a>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding:8px 26px 28px;color:#9ca3af;font-size:14px;line-height:22px;">
              Questions? Reply to this email and we will help you out.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
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

/** ---------- New: Admin notification ---------- */
export async function notifyAdminNewOrder(p: {
  orderNumber: string;
  currency?: string;
  locale?: string;
  customerEmail?: string;
  customerName?: string;
  fulfillmentStatus?: string;
  adminUrl?: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  items?: ReceiptItem[];
  raw?: unknown;     // only included when EMAIL_INCLUDE_RAW_ORDER=1
  to?: string | string[]; // override; otherwise uses ORDER_TO_EMAIL
}) {
  const to = p.to ?? parseRecipients(process.env.ORDER_TO_EMAIL);
  const currency = p.currency || 'USD';
  const locale = p.locale || (currency === 'PHP' ? 'en-PH' : 'en-US');

  const summaryRows =
    p.items?.map(
      i => `<tr>
        <td style="padding:10px 0;color:#e5e7eb;border-bottom:1px solid #1f2937;">
          <div style="font-weight:700;color:#ffffff;">${escapeHtml(i.title)}</div>
          <div style="font-size:12px;line-height:18px;color:#9ca3af;">${[
            itemOptionHtml(i, ' / '),
            i.sku ? `SKU: ${escapeHtml(i.sku)}` : '',
          ].filter(Boolean).join(' | ')}</div>
        </td>
        <td style="padding:10px 8px;text-align:center;color:#9ca3af;border-bottom:1px solid #1f2937;">${i.qty}</td>
        <td style="padding:10px 0;text-align:right;color:#9ca3af;border-bottom:1px solid #1f2937;white-space:nowrap;">${money(i.unitPrice, currency, locale)}</td>
      </tr>`
    ).join('') ?? '';

  const includeRaw = process.env.EMAIL_INCLUDE_RAW_ORDER === '1';
  const rawJson = includeRaw && p.raw
    ? JSON.stringify(
        p.raw,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    : '';

  const totalRows = [
    ...(typeof p.subtotal === 'number' ? [['Subtotal', money(p.subtotal, currency, locale), false] as const] : []),
    ...(typeof p.shipping === 'number' ? [['Shipping', money(p.shipping, currency, locale), false] as const] : []),
    ...(typeof p.tax === 'number' ? [['Tax', money(p.tax, currency, locale), false] as const] : []),
    ['Total', money(p.total, currency, locale), true] as const,
  ]
    .map(([label, value, strong]) => `
      <tr>
        <td style="padding:${strong ? '10px 0 0' : '6px 0'};color:${strong ? '#ffffff' : '#9ca3af'};font-weight:${strong ? '800' : '500'};">${label}</td>
        <td style="padding:${strong ? '10px 0 0' : '6px 0'};text-align:right;color:#ffffff;font-weight:${strong ? '800' : '500'};white-space:nowrap;">${value}</td>
      </tr>`)
    .join('');

  const customerLine = [
    p.customerName ? escapeHtml(p.customerName) : '',
    p.customerEmail ? escapeHtml(p.customerEmail) : '',
  ].filter(Boolean).join(' | ') || 'Unknown';

  const html = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial, Helvetica, sans-serif;color:#e5e7eb;">
      <tr>
        <td align="center" style="padding:18px 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;background:#0b0f19;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:26px 26px 14px;">
                <div style="color:#ff4f5f;font-size:12px;font-weight:800;letter-spacing:0;text-transform:uppercase;">Admin order alert</div>
                <h1 style="margin:8px 0 8px;color:#ffffff;font-size:24px;line-height:30px;">New order: ${escapeHtml(p.orderNumber)}</h1>
                <p style="margin:0;color:#9ca3af;font-size:14px;line-height:22px;">Customer: ${customerLine}</p>
                ${p.fulfillmentStatus ? `<p style="margin:6px 0 0;color:#9ca3af;font-size:14px;line-height:22px;">Fulfillment: <strong style="color:#ffffff">${escapeHtml(p.fulfillmentStatus)}</strong></p>` : ''}
              </td>
            </tr>
            ${
              summaryRows
                ? `<tr>
                    <td style="padding:0 26px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                        <thead>
                          <tr>
                            <th align="left" style="padding:10px 0;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Item</th>
                            <th align="center" style="padding:10px 8px;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Qty</th>
                            <th align="right" style="padding:10px 0;color:#9ca3af;font-size:12px;font-weight:700;border-bottom:1px solid #1f2937;">Price</th>
                          </tr>
                        </thead>
                        <tbody>${summaryRows}</tbody>
                      </table>
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding:14px 26px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${totalRows}
                </table>
              </td>
            </tr>
            ${
              p.adminUrl
                ? `<tr>
                    <td style="padding:18px 26px 8px;">
                      <a href="${escapeAttr(p.adminUrl)}" style="display:inline-block;background:#f7f1df;color:#000000;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:800;">Open orders dashboard</a>
                    </td>
                  </tr>`
                : ''
            }
            ${
              rawJson
                ? `<tr>
                    <td style="padding:12px 26px 26px;">
                      <pre style="margin:0;background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;font-family:Consolas, Menlo, Monaco, monospace;font-size:12px;line-height:18px;white-space:pre-wrap;">${escapeHtml(rawJson)}</pre>
                    </td>
                  </tr>`
                : '<tr><td style="padding:8px 26px 26px;color:#9ca3af;font-size:13px;line-height:20px;">Raw order JSON is saved in the admin database and no longer attached to this email by default.</td></tr>'
            }
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = `New order ${p.orderNumber}
Customer: ${[p.customerName, p.customerEmail].filter(Boolean).join(' | ') || 'Unknown'}
Fulfillment: ${p.fulfillmentStatus ?? 'Not submitted'}
Total: ${money(p.total, currency, locale)}
${p.items?.map(i => {
  const options = itemOptionText(i);
  return `- ${i.title}${options ? ` (${options})` : ''} x${i.qty} @ ${money(i.unitPrice, currency, locale)}`;
}).join('\n') ?? ''}

${p.adminUrl ? `Admin dashboard: ${p.adminUrl}` : ''}
${rawJson ? `\nRAW:\n${rawJson}` : ''}`;

  return sendEmail({
    to,
    subject: `[ADMIN] New order ${p.orderNumber}`,
    html,
    text,
  });
}
