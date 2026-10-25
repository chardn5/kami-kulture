import { z } from "zod";

export const checkoutCountries = [
  ["PH", "Philippines"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["HK", "Hong Kong"],
  ["TW", "Taiwan"],
  ["MY", "Malaysia"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["ID", "Indonesia"],
  ["AE", "United Arab Emirates"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["IE", "Ireland"],
  ["PT", "Portugal"],
  ["GR", "Greece"],
  ["PL", "Poland"],
  ["CZ", "Czechia"],
  ["HU", "Hungary"],
  ["RO", "Romania"],
  ["TR", "Turkey"],
  ["IL", "Israel"],
  ["SA", "Saudi Arabia"],
  ["ZA", "South Africa"],
  ["BR", "Brazil"],
  ["MX", "Mexico"],
] as const;

const required = z
  .string()
  .trim()
  .min(1, "Required")
  .max(100, "Please shorten this field");
export const checkoutCustomerSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email").max(254),
    firstName: required,
    lastName: required,
    phone: z.string().trim().max(40).optional(),
    address1: required,
    address2: z.string().trim().max(100).optional(),
    city: required,
    state: z.string().trim().max(100),
    postalCode: z.string().trim().min(3, "Enter a postal code").max(16),
    country: z
      .string()
      .length(2)
      .refine(
        (code) => checkoutCountries.some(([c]) => c === code),
        "Choose a supported country",
      ),
  })
  .superRefine((value, ctx) => {
    if (["US", "CA", "AU", "PH"].includes(value.country) && !value.state) {
      ctx.addIssue({
        code: "custom",
        path: ["state"],
        message: "Enter your state or province",
      });
    }
    if (value.country === "US" && !/^[A-Z]{2}$/.test(value.state)) {
      ctx.addIssue({
        code: "custom",
        path: ["state"],
        message: "Choose a US state",
      });
    }
    if (value.country === "US" && !/^\d{5}(-\d{4})?$/.test(value.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: "Enter a valid ZIP code",
      });
    }
  });

export type CheckoutCustomer = z.infer<typeof checkoutCustomerSchema>;
export const cartRequestSchema = z
  .array(
    z.object({
      sku: z.string().min(1).max(120),
      qty: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(20)
  .refine(
    (lines) => lines.reduce((n, line) => n + line.qty, 0) <= 20,
    "Maximum 20 items per order",
  );
