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
    // You can verify in DevTools that you're getting clean values.
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
          {...register('email')}
          className="w-full rounded-xl border px-3 py-2"
        />,
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field(
          'firstName',
          <input
            placeholder="First name"
            {...register('firstName')}
            className="w-full rounded-xl border px-3 py-2"
          />,
        )}
        {field(
          'lastName',
          <input
            placeholder="Last name"
            {...register('lastName')}
            className="w-full rounded-xl border px-3 py-2"
          />,
        )}
      </div>

      {field(
        'phone',
        <input
          placeholder="Phone (optional)"
          {...register('phone')}
          className="w-full rounded-xl border px-3 py-2"
        />,
      )}

      {field(
        'address1',
        <input
          placeholder="Address line 1"
          {...register('address1')}
          className="w-full rounded-xl border px-3 py-2"
        />,
      )}

      {field(
        'address2',
        <input
          placeholder="Address line 2 (optional)"
          {...register('address2')}
          className="w-full rounded-xl border px-3 py-2"
        />,
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {field(
          'city',
          <input
            placeholder="City/Municipality"
            {...register('city')}
            className="w-full rounded-xl border px-3 py-2"
          />,
        )}
        {field(
          'state',
          <input
            placeholder="Province/State"
            {...register('state')}
            className="w-full rounded-xl border px-3 py-2"
          />,
        )}
        {field(
          'postalCode',
          <input
            placeholder="Postal code"
            {...register('postalCode')}
            className="w-full rounded-xl border px-3 py-2"
          />,
        )}
      </div>

      {field(
        'country',
        <input
          placeholder="Country (e.g., PH)"
          {...register('country')}
          className="w-full rounded-xl border px-3 py-2"
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
        className="text-xs opacity-70 underline justify-self-start"
      >
        Reset form
      </button>
    </form>
  );
}
