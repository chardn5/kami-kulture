// src/components/CheckoutForm.tsx
"use client";

import { useForm } from "react-hook-form";
import {
  checkoutCustomerSchema as Schema,
  checkoutCountries,
  type CheckoutCustomer,
} from "@/lib/checkoutSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import type { ReactNode } from "react";

// ───────────────────────────────────────────────────────────────────────────────
// Validation schema
// ───────────────────────────────────────────────────────────────────────────────
export type CheckoutFormValues = CheckoutCustomer;
export type NormalizedCheckout = CheckoutCustomer;

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
  "h-11 w-full rounded-md border border-[#f7f1df]/16 bg-[#0f0f0c] px-3 text-sm text-[#f7f1df] placeholder:text-[#f7f1df]/38 caret-[#f7f1df]";
const inputStyle: React.CSSProperties = { WebkitTextFillColor: "#f7f1df" };

// ───────────────────────────────────────────────────────────────────────────────
// Reference lists
// ───────────────────────────────────────────────────────────────────────────────
const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
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
  state:
    v.country.toUpperCase() === "US" ? v.state.toUpperCase() : v.state.trim(),
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
    mode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "PH",
      ...initialValues,
    },
  });

  const valuesJson = JSON.stringify(watch());
  const country = watch("country");

  // Emit PayPal-ready values whenever valid
  useEffect(() => {
    onValidChange?.(
      isValid ? normalize(JSON.parse(valuesJson) as CheckoutFormValues) : null,
    );
  }, [isValid, valuesJson, onValidChange]);

  function onSubmit() {
    // Parent receives normalized values through onValidChange.
  }

  const field = (
    name: keyof CheckoutFormValues,
    label: string,
    input: ReactNode,
  ) => (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`checkout-${name}`}
        className="text-xs font-black uppercase text-[#f7f1df]/58"
      >
        {label}
      </label>
      {input}
      {errors[name]?.message && (
        <p className="text-xs text-[#ff4f5f]">
          {String(errors[name]?.message)}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {field(
        "email",
        "Email",
        <input
          id="checkout-email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          {...register("email")}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field(
          "firstName",
          "First name",
          <input
            id="checkout-firstName"
            placeholder="First name"
            autoComplete="given-name"
            {...register("firstName")}
            className={inputClass}
            style={inputStyle}
          />,
        )}
        {field(
          "lastName",
          "Last name",
          <input
            id="checkout-lastName"
            placeholder="Last name"
            autoComplete="family-name"
            {...register("lastName")}
            className={inputClass}
            style={inputStyle}
          />,
        )}
      </div>

      {field(
        "phone",
        "Phone (optional)",
        <input
          id="checkout-phone"
          placeholder="Phone (optional)"
          autoComplete="tel"
          {...register("phone")}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      {field(
        "address1",
        "Address line 1",
        <input
          id="checkout-address1"
          placeholder="Address line 1"
          autoComplete="address-line1"
          {...register("address1")}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      {field(
        "address2",
        "Address line 2 (optional)",
        <input
          id="checkout-address2"
          placeholder="Address line 2 (optional)"
          autoComplete="address-line2"
          {...register("address2")}
          className={inputClass}
          style={inputStyle}
        />,
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {field(
          "city",
          "City",
          <input
            id="checkout-city"
            placeholder="City/Municipality"
            autoComplete="address-level2"
            {...register("city")}
            className={inputClass}
            style={inputStyle}
          />,
        )}

        {country.toUpperCase() === "US"
          ? field(
              "state",
              "State",
              <select
                id="checkout-state"
                {...register("state")}
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
              "state",
              "Province or state",
              <input
                id="checkout-state"
                placeholder="Province/State"
                autoComplete="address-level1"
                {...register("state")}
                className={inputClass}
                style={inputStyle}
              />,
            )}

        {field(
          "postalCode",
          "Postal code",
          <input
            id="checkout-postalCode"
            placeholder="Postal code"
            autoComplete="postal-code"
            {...register("postalCode")}
            className={inputClass}
            style={inputStyle}
          />,
        )}
      </div>

      {field(
        "country",
        "Country",
        <select
          id="checkout-country"
          {...register("country")}
          className={inputClass}
          style={inputStyle}
          autoComplete="country"
          defaultValue={initialValues?.country ?? "PH"}
        >
          {checkoutCountries.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>,
      )}

      <button
        type="button"
        onClick={() => reset()}
        className="kk-focus justify-self-start rounded-md text-xs font-semibold text-[#f7f1df]/54 hover:text-[#35d7f2]"
      >
        Clear form
      </button>
    </form>
  );
}
