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
  'w-full rounded-md border border-[#f7f1df]/16 bg-[#0f0f0c] text-[#f7f1df] ' +
  'placeholder:text-[#f7f1df]/38 caret-[#f7f1df] px-3 py-2 ' +
  'outline-none focus:ring-2 focus:ring-[#35d7f2]/60 focus:border-transparent ' +
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
        <label htmlFor={inputId} className="mb-1 block text-sm font-semibold text-[#f7f1df]/72">
          {label}
        </label>
      )}
      <input id={inputId} ref={ref} className={cn(base, className)} {...props} />
      {hint && <p className="mt-1 text-xs text-[#f7f1df]/46">{hint}</p>}
    </div>
  );
});

export default Input;
