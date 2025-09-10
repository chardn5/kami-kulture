// src/components/CheckoutForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

// ───────────────────────────────────────────────────────────────────────────────
// Validation schema
// ───────────────────────────────────────────────────────────────────────────────
const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address1: z.string().min(1, 'Required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),            // keep required; UI enforces dropdown for US
  postalCode: z.string().min(3, 'Required'),
  country: z.string().length(2, 'Use 2-letter code'), // ISO-2
}).superRefine((v, ctx) => {
  const country = v.country.toUpperCase();
  if (country === 'US') {
    if (!/^[A-Z]{2}$/.test(v.state))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'Use 2-letter state code (e.g., CA)' });
    if (!/^\d{5}(-\d{4})?$/.test(v.postalCode))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postalCode'], message: 'Enter a 5-digit ZIP' });
    if (!/^[\p{L} .'-]{2,}$/u.test(v.city))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'Enter a valid city' });
  }
});

export type CheckoutFormValues = z.infer<typeof Schema>;

// What the parent (and PayPal) expects
export type NormalizedCheckout = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;         // admin_area_2
  state: string;        // admin_area_1 (2-letter for US)
  postalCode: string;   // postal_code
  country: string;      // ISO-2 uppercase
};

type Props = {
  /** Emits PayPal-ready values when the form is valid; null otherwise */
  onValidChange?: (values: NormalizedCheckout | null) => void;
  /** Optional: initial values (e.g., from profile/autofill) */
  initialValues?: Partial<CheckoutFormValues>;
};

// ───────────────────────────────────────────────────────────────────────────────
// Styling
// ───────────────────────────────────────────────────────────────────────────────
const inputClass =
  'w-full rounded-xl border px-3 py-2 bg-white text-black placeholder:text-neutral-500 caret-black';
const inputStyle: React.CSSProperties = { WebkitTextFillColor: '#000' };

// ───────────────────────────────────────────────────────────────────────────────
// Reference lists
// ───────────────────────────────────────────────────────────────────────────────
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'PH', name: 'Philippines' }, { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' }, { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' }, { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' }, { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' }, { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' }, { code: 'PT', name: 'Portugal' }, { code: 'GR', name: 'Greece' },
  { code: 'PL', name: 'Poland' }, { code: 'CZ', name: 'Czechia' }, { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' }, { code: 'TR', name: 'Turkey' }, { code: 'IL', name: 'Israel' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' },
];

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

// ───────────────────────────────────────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────────────────────────────────────
const normalize = (v: CheckoutFormValues): NormalizedCheckout => ({
  email: v.email.trim(),
  firstName: v.firstName.trim(),
  lastName: v.lastName.trim(),
  phone: v.phone?.trim() || undefined,
  address1: v.address1.trim(),
  address2: v.address2?.trim() || undefined,
  city: v.city.trim(),
  state: v.country.toUpperCase() === 'US' ? v.state.toUpperCase() : v.state.trim(),
  postalCode: v.postalCode.trim(),
  country: v.country.toUpperCase(),
});

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

  const values = watch();
  const country = watch('country');

  // Emit PayPal-ready values whenever valid
  useEffect(() => {
    onValidChange?.(isValid ? normalize(values) : null);
  }, [isValid, values, onValidChange]);

  function onSubmit(data: CheckoutFormValues) {
    // Keep submit for local testing; parent will still receive normalized values via onValidChange
    console.log('CheckoutForm submit:', normalize(data));
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

        {country.toUpperCase() === 'US'
          ? field(
              'state',
              <select
                {...register('state')}
                className={inputClass}
                style={inputStyle}
                autoComplete="address-level1"
                defaultValue=""
              >
                <option value="" disabled>
                  Select state
                </option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>,
            )
          : field(
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
        <select
          {...register('country')}
          className={inputClass}
          style={inputStyle}
          autoComplete="country"
          defaultValue={initialValues?.country ?? 'PH'}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>,
      )}

      <button
        type="submit"
        className="rounded-xl border px-4 py-2 disabled:opacity-50"
        disabled={!isValid}
      >
        Save details
      </button>

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
