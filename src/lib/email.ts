// lib/email.ts
import 'server-only';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function emailOrderJSON(
  subject: string,
  json: unknown,
  opts?: { to?: string; html?: string }
) {
  const to = opts?.to || process.env.ORDER_TO_EMAIL!;
  const from = process.env.EMAIL_FROM!;

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: JSON.stringify(json, null, 2),
    html: opts?.html || `<pre>${JSON.stringify(json, null, 2)}</pre>`,
  });

  if (error) {
    console.error('EMAIL_SEND_FAIL', error);
    throw new Error(error.message || 'Resend send failed');
  }

  console.log('EMAIL_SEND_OK', data?.id);
  return { id: data?.id };
}
