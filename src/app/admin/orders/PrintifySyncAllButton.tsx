'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function PrintifySyncAllButton() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function syncOnce() {
    const res = await fetch('/api/admin/printify/sync-orders', {
      method: 'POST',
      credentials: 'same-origin',
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      checked?: number;
      updated?: number;
      failed?: number;
      error?: string;
    };
    return { res, json };
  }

  async function sync() {
    if (isSaving) return;
    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      let { res, json } = await syncOnce();
      if (res.status === 401) {
        await fetch('/admin/sign-in?next=/admin/orders', {
          credentials: 'same-origin',
        }).catch(() => null);
        ({ res, json } = await syncOnce());
      }

      if (!res.ok || !json.ok) {
        setError(json.error || 'Printify sync failed.');
        return;
      }

      setMessage(`Synced ${json.checked ?? 0} orders, ${json.failed ?? 0} failed.`);
      startTransition(() => router.refresh());
    } catch {
      setError('Network error.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="kk-focus inline-flex h-10 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={isSaving || isPending}
        onClick={sync}
        type="button"
      >
        {isSaving || isPending ? 'Syncing...' : 'Sync Printify'}
      </button>
      {message ? <p className="text-xs font-semibold text-[#d6ff57]">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-[#ff4f5f]">{error}</p> : null}
    </div>
  );
}
