'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { getOrderStatusMeta, ORDER_STATUS_OPTIONS } from '@/lib/orderStatus';

type Props = {
  orderId: string;
  currentStatus: string;
};

export default function OrderStatusControl({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => {
    const known = ORDER_STATUS_OPTIONS as readonly string[];
    return known.includes(currentStatus) ? ORDER_STATUS_OPTIONS : [currentStatus, ...ORDER_STATUS_OPTIONS];
  }, [currentStatus]);

  const isDirty = status !== currentStatus;

  async function updateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error || 'Status update failed.');
        return;
      }

      setMessage('Updated');
      startTransition(() => router.refresh());
    } catch {
      setError('Network error.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={updateStatus} className="grid gap-2 rounded-md border border-[#f7f1df]/10 bg-black/18 p-3">
      <label className="text-xs font-black uppercase text-[#f7f1df]/44" htmlFor={`status-${orderId}`}>
        Admin status
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id={`status-${orderId}`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setMessage('');
            setError('');
          }}
          className="h-10 min-w-0 rounded-md border border-[#f7f1df]/18 bg-[#0f0f0c] px-3 text-sm font-semibold text-[#f7f1df]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {getOrderStatusMeta(option).label}
            </option>
          ))}
        </select>
        <button
          className="kk-focus inline-flex h-10 items-center justify-center rounded-md bg-[#f7f1df] px-3 text-sm font-black text-black hover:bg-[#d6ff57] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!isDirty || isSaving || isPending}
          type="submit"
        >
          {isSaving || isPending ? 'Saving...' : 'Update'}
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-[#ff4f5f]">{error}</p> : null}
      {message ? <p className="text-xs font-semibold text-[#d6ff57]">{message}</p> : null}
    </form>
  );
}
