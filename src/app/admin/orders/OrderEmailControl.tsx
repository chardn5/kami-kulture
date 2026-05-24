'use client';

import { useState } from 'react';

type Props = {
  orderId: string;
  customerEmail?: string | null;
};

type EmailType = 'receipt' | 'status';

export default function OrderEmailControl({ orderId, customerEmail }: Props) {
  const [busyType, setBusyType] = useState<EmailType | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const hasEmail = !!customerEmail;

  async function postEmail(type: EmailType) {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ type }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sentTo?: string };
    return { res, json };
  }

  async function send(type: EmailType) {
    if (!hasEmail || busyType) return;

    setBusyType(type);
    setMessage('');
    setError('');

    try {
      let { res, json } = await postEmail(type);

      if (res.status === 401) {
        await fetch(`/admin/sign-in?next=/admin/orders/${encodeURIComponent(orderId)}`, {
          credentials: 'same-origin',
        }).catch(() => null);
        ({ res, json } = await postEmail(type));
      }

      if (!res.ok || !json.ok) {
        setError(json.error || 'Email failed.');
        return;
      }

      setMessage(`${type === 'receipt' ? 'Receipt' : 'Status update'} sent to ${json.sentTo || customerEmail}`);
    } catch {
      setError('Network error.');
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-[#f7f1df]/10 bg-black/18 p-3">
      <div>
        <p className="text-xs font-black uppercase text-[#f7f1df]/44">Customer email</p>
        <p className="mt-1 break-all text-sm text-[#f7f1df]/62">
          {customerEmail || 'No customer email saved for this order.'}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="kk-focus inline-flex h-10 items-center justify-center rounded-md bg-[#f7f1df] px-3 text-sm font-black text-black hover:bg-[#d6ff57] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!hasEmail || !!busyType}
          onClick={() => send('receipt')}
          type="button"
        >
          {busyType === 'receipt' ? 'Sending...' : 'Resend receipt'}
        </button>
        <button
          className="kk-focus inline-flex h-10 items-center justify-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-black text-[#f7f1df] hover:bg-[#f7f1df]/8 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!hasEmail || !!busyType}
          onClick={() => send('status')}
          type="button"
        >
          {busyType === 'status' ? 'Sending...' : 'Send status update'}
        </button>
      </div>
      {message ? <p className="text-xs font-semibold text-[#d6ff57]">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-[#ff4f5f]">{error}</p> : null}
    </div>
  );
}
