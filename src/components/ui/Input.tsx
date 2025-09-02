'use client';

import * as React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

const base =
  'w-full rounded-md border border-white/20 bg-white text-black ' +
  'placeholder:text-neutral-500 caret-black px-3 py-2 ' +
  'outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, hint, id, ...props },
  ref
) {
  // Call the hook unconditionally, then prefer the passed id.
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm text-neutral-300">
          {label}
        </label>
      )}
      <input id={inputId} ref={ref} className={cn(base, className)} {...props} />
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
});

export default Input;
