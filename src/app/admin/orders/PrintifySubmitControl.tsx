'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = {
  orderId: string;
  currentStatus: string;
  printifyOrderId?: string | null;
  printifyStatus?: string | null;
  printifySubmittedAt?: string | null;
  printifyLastError?: string | null;
  readinessIssues: string[];
};

const SUBMITTABLE_STATUSES = new Set(['PAID', 'IN_PRODUCTION', 'FULFILLMENT_FAILED']);

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function PrintifySubmitControl({
  orderId,
  currentStatus,
  printifyOrderId,
  printifyStatus,
  printifySubmittedAt,
  printifyLastError,
  readinessIssues,
}: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const hasPrintifyOrder = !!printifyOrderId;
  const canSubmitStatus = SUBMITTABLE_STATUSES.has(currentStatus);
  const isReady = readinessIssues.length === 0;
  const canSubmit = !hasPrintifyOrder && canSubmitStatus && isReady;

  async function submitOnce() {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/printify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({}),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      detail?: string;
      issues?: string[];
      order?: { printifyOrderId?: string | null };
    };
    return { res, json };
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || isSaving) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      let { res, json } = await submitOnce();

      if (res.status === 401) {
        await fetch('/admin/sign-in?next=/admin/orders', {
          credentials: 'same-origin',
        }).catch(() => null);
        ({ res, json } = await submitOnce());
      }

      if (!res.ok || !json.ok) {
        const issueText = json.issues?.length ? ` ${json.issues.join(' ')}` : '';
        setError(`${json.detail || json.error || 'Printify submission failed.'}${issueText}`);
        return;
      }

      setMessage(`Submitted${json.order?.printifyOrderId ? `: ${json.order.printifyOrderId}` : ''}`);
      startTransition(() => router.refresh());
    } catch {
      setError('Network error.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-md border border-[#f7f1df]/10 bg-black/18 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-[#f7f1df]/44">Printify fulfillment</p>
          {hasPrintifyOrder ? (
            <p className="mt-1 break-all text-sm font-semibold text-[#d6ff57]">
              {printifyOrderId}
              {printifyStatus ? <span className="text-[#f7f1df]/48"> / {printifyStatus}</span> : null}
            </p>
          ) : isReady ? (
            <p className="mt-1 text-sm text-[#f7f1df]/58">
              {canSubmitStatus ? 'Ready for manual submission.' : `Blocked by status: ${currentStatus}.`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#ff4f5f]">Needs repair before submission.</p>
          )}
        </div>

        <button
          className="kk-focus inline-flex h-10 items-center justify-center rounded-md bg-[#d6ff57] px-3 text-sm font-black text-black hover:bg-[#f7f1df] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canSubmit || isSaving || isPending}
          type="submit"
        >
          {isSaving || isPending ? 'Submitting...' : 'Submit to Printify'}
        </button>
      </div>

      {printifySubmittedAt ? (
        <p className="text-xs font-semibold text-[#f7f1df]/48">Submitted {formatDate(printifySubmittedAt)}</p>
      ) : null}

      {readinessIssues.length ? (
        <ul className="space-y-1 text-xs font-semibold text-[#ff4f5f]">
          {readinessIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {printifyLastError ? <p className="break-words text-xs font-semibold text-[#ff4f5f]">{printifyLastError}</p> : null}
      {error ? <p className="break-words text-xs font-semibold text-[#ff4f5f]">{error}</p> : null}
      {message ? <p className="text-xs font-semibold text-[#d6ff57]">{message}</p> : null}
    </form>
  );
}
