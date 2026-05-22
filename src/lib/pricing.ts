export type OrderPricing = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  freeShippingThreshold: number;
  flatShipping: number;
};

function envNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrderPricing(subtotal: number, currency = 'USD'): OrderPricing {
  const normalizedSubtotal = roundMoney(Math.max(0, subtotal));
  const currencyKey = currency.toUpperCase();
  const flatShipping = envNumber(
    `NEXT_PUBLIC_FLAT_SHIPPING_${currencyKey}`,
    envNumber('NEXT_PUBLIC_FLAT_SHIPPING_USD', 7.99)
  );
  const freeShippingThreshold = envNumber(
    `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_${currencyKey}`,
    envNumber('NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_USD', 75)
  );
  const shipping = normalizedSubtotal >= freeShippingThreshold ? 0 : flatShipping;
  const tax = 0;

  return {
    subtotal: normalizedSubtotal,
    shipping: roundMoney(shipping),
    tax,
    total: roundMoney(normalizedSubtotal + shipping + tax),
    freeShippingThreshold,
    flatShipping,
  };
}

export function estimatePaymentFee(total: number, currency = 'USD') {
  const currencyKey = currency.toUpperCase();
  const percent = envNumber('PAYPAL_FEE_PERCENT', 3.49);
  const fixed = envNumber(`PAYPAL_FEE_FIXED_${currencyKey}`, envNumber('PAYPAL_FEE_FIXED_USD', 0.49));
  return roundMoney((Math.max(0, total) * percent) / 100 + fixed);
}

export function estimateProfit(params: {
  customerTotal: number;
  printifyCostTotal: number;
  currency?: string;
}) {
  const fee = estimatePaymentFee(params.customerTotal, params.currency);
  return {
    estimatedPaymentFee: fee,
    estimatedProfit: roundMoney(params.customerTotal - params.printifyCostTotal - fee),
  };
}
