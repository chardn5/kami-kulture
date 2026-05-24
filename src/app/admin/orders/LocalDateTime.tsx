'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  value?: string | null;
  className?: string;
  includeSeconds?: boolean;
};

function fallbackDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatLocalDate(value?: string | null, includeSeconds = false) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : {}),
    timeZoneName: 'short',
  }).format(date);
}

export function LocalTimeZoneNote({ className = '' }: { className?: string }) {
  const [timeZone, setTimeZone] = useState('');

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  }, []);

  return (
    <span className={className}>
      Times use your browser timezone{timeZone ? `: ${timeZone}` : ''}.
    </span>
  );
}

export default function LocalDateTime({ value, className = '', includeSeconds = false }: Props) {
  const fallback = useMemo(() => fallbackDate(value), [value]);
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    setLabel(formatLocalDate(value, includeSeconds));
  }, [fallback, includeSeconds, value]);

  return (
    <time className={className} dateTime={value ?? undefined} suppressHydrationWarning title={fallback}>
      {label}
    </time>
  );
}
