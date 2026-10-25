'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function RetryPaymentsButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return <div><button disabled={busy} onClick={async () => {
    setBusy(true); setMessage('');
    try { const response = await fetch('/api/admin/payments/retry', { method: 'POST' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Retry failed');
      setMessage(`${data.checked} orders checked; ${data.failed} still need attention.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Retry failed'); } finally { setBusy(false); }
  }} className="kk-focus inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} />{busy ? 'Retrying…' : 'Retry notifications'}</button><p role="status" className="mt-2 text-xs text-white/60">{message}</p></div>;
}
