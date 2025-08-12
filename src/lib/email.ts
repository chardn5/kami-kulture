// lib/email.ts
import 'server-only';

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
  return raw;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

export async function emailOrderJSON(
  subject: string,
  json: unknown,
  opts?: { to?: string | string[]; html?: string }
) {
  const to = opts?.to ?? parseRecipients(process.env.ORDER_TO_EMAIL);
  const from = cleanFrom(process.env.EMAIL_FROM) || 'orders@kamikulture.com'; // <- sanitized

  console.log('EMAIL_ENV_CHECK', {
    hasKey: !!process.env.RESEND_API_KEY,
    from,
    to,
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to, // string or string[] both supported
      subject,
      text: JSON.stringify(json, null, 2),
      html: opts?.html || `<pre>${escapeHtml(JSON.stringify(json, null, 2))}</pre>`,
    }),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('RESEND_RAW_FAIL', res.status, body);
    return { ok: false, status: res.status, body };
  }
  console.log('RESEND_RAW_OK', body?.id || body);
  return { ok: true, id: body?.id };
}
