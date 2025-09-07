// src/components/CheckoutForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address1: z.string().min(1, 'Required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().optional(),
  postalCode: z.string().min(3, 'Required'),
  country: z.string().min(2, 'Required'),
});

export type CheckoutFormValues = z.infer<typeof Schema>;

type Props = {
  /** Optional: get values when the form becomes valid (for future wiring) */
  onValidChange?: (values: CheckoutFormValues | null) => void;
  /** Optional: initial values (e.g., from profile/autofill) */
  initialValues?: Partial<CheckoutFormValues>;
};

// ✅ Force readable text on dark theme + Chrome Autofill
const inputClass =
  'w-full rounded-xl border px-3 py-2 bg-white text-black placeholder:text-neutral-500 caret-black';
const inputStyle: React.CSSProperties = {
  WebkitTextFillColor: '#000', // fixes white text with Chrome autofill
};

export default function CheckoutForm({ onValidChange, initialValues }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(Schema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'PH',
      ...initialValues,
    },
  });

  // Emit values upward only when valid (no PayPal wiring yet)
  const values = watch();
  useEffect(() => {
    onValidChange?.(isValid ? values : null);
  }, [isValid, values, onValidChange]);

  function onSubmit(data: CheckoutFormValues) {
    // For now, do nothing disruptive. Keep it isolated.
    console.log('CheckoutForm submit:', data);
  }

  const field = (name: keyof CheckoutFormValues, input: ReactNode) => (
    <div className="flex flex-col gap-1">
      {input}
      {errors[name]?.message && (
        <p className="text-xs text-red-600">{String(errors[name]?.message)}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {field(
        'email',
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          {...register('email')}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field(
          'firstName',
          <input
            placeholder="First name"
            autoComplete="given-name"
            {...register('firstName')}
            className={inputClass}
            style={inputStyle}
          />,
        )}
        {field(
          'lastName',
          <input
            placeholder="Last name"
            autoComplete="family-name"
            {...register('lastName')}
            className={inputClass}
            style={inputStyle}
          />,
        )}
      </div>

      {field(
        'phone',
        <input
          placeholder="Phone (optional)"
          autoComplete="tel"
          {...register('phone')}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      {field(
        'address1',
        <input
          placeholder="Address line 1"
          autoComplete="address-line1"
          {...register('address1')}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      {field(
        'address2',
        <input
          placeholder="Address line 2 (optional)"
          autoComplete="address-line2"
          {...register('address2')}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {field(
          'city',
          <input
            placeholder="City/Municipality"
            autoComplete="address-level2"
            {...register('city')}
            className={inputClass}
            style={inputStyle}
          />,
        )}
        {field(
          'state',
          <input
            placeholder="Province/State"
            autoComplete="address-level1"
            {...register('state')}
            className={inputClass}
            style={inputStyle}
          />,
        )}
        {field(
          'postalCode',
          <input
            placeholder="Postal code"
            autoComplete="postal-code"
            {...register('postalCode')}
            className={inputClass}
            style={inputStyle}
          />,
        )}
      </div>

      {field(
        'country',
        <input
          placeholder="Country (e.g., PH)"
          autoComplete="country"
          {...register('country')}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      {/* Keep the submit button for local validation only */}
      <button
        type="submit"
        className="rounded-xl border px-4 py-2 disabled:opacity-50"
        disabled={!isValid}
      >
        Save details
      </button>

      {/* Helper row for quick dev testing */}
      <button
        type="button"
        onClick={() => reset()}
        className="justify-self-start text-xs underline opacity-70"
      >
        Reset form
      </button>
    </form>
  );
}
