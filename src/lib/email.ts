import 'server-only';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function emailOrderJSON(subject: string, json: unknown) {
  const to = process.env.ORDER_TO_EMAIL!;
  const from = process.env.EMAIL_FROM!;
  const res = await resend.emails.send({
    from,
    to,
    subject,
    text: JSON.stringify(json, null, 2),
  });
  return res;
}
