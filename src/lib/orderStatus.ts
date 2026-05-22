export const ORDER_STATUS_OPTIONS = [
  'PAID',
  'IN_PRODUCTION',
  'FULFILLMENT_SUBMITTED',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
  'FULFILLMENT_FAILED',
] as const;

export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

type OrderStatusMeta = {
  label: string;
  customerDescription: string;
  adminDescription: string;
  phase: number;
  badgeClass: string;
  isProblem?: boolean;
};

const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  PAID: {
    label: 'Paid',
    customerDescription: 'Payment was received and the order is waiting for production.',
    adminDescription: 'Payment captured. Review and send to production when ready.',
    phase: 1,
    badgeClass: 'bg-[#d6ff57] text-black',
  },
  IN_PRODUCTION: {
    label: 'In production',
    customerDescription: 'Your design is in the production queue.',
    adminDescription: 'Order is being prepared or printed.',
    phase: 2,
    badgeClass: 'bg-[#35d7f2] text-black',
  },
  FULFILLMENT_SUBMITTED: {
    label: 'In Printify',
    customerDescription: 'The production partner received the order and is preparing the next step.',
    adminDescription: 'Printify order exists. Check the Printify fulfillment status below.',
    phase: 2,
    badgeClass: 'bg-[#35d7f2] text-black',
  },
  SHIPPED: {
    label: 'Shipped',
    customerDescription: 'Your order has shipped. Tracking details will be sent by email when available.',
    adminDescription: 'Order is on the way to the customer.',
    phase: 3,
    badgeClass: 'bg-[#f7f1df] text-black',
  },
  DELIVERED: {
    label: 'Delivered',
    customerDescription: 'The order has been marked delivered.',
    adminDescription: 'Order is complete.',
    phase: 4,
    badgeClass: 'bg-[#f7f1df] text-black',
  },
  CANCELED: {
    label: 'Canceled',
    customerDescription: 'This order was canceled. Contact support if you have questions.',
    adminDescription: 'Order was canceled.',
    phase: 0,
    badgeClass: 'bg-[#ff4f5f] text-white',
    isProblem: true,
  },
  REFUNDED: {
    label: 'Refunded',
    customerDescription: 'This order was refunded. Contact support if you have questions.',
    adminDescription: 'Payment was refunded.',
    phase: 0,
    badgeClass: 'bg-[#ff4f5f] text-white',
    isProblem: true,
  },
  FULFILLMENT_FAILED: {
    label: 'Needs attention',
    customerDescription: 'The order needs a manual review before production continues.',
    adminDescription: 'Printify submission failed or needs manual repair.',
    phase: 0,
    badgeClass: 'bg-[#ff4f5f] text-white',
    isProblem: true,
  },
};

export const ORDER_TRACKING_STEPS = [
  {
    phase: 1,
    title: 'Paid',
    body: 'Payment captured',
  },
  {
    phase: 2,
    title: 'In production',
    body: 'Preparing the print',
  },
  {
    phase: 3,
    title: 'Shipped',
    body: 'On the way',
  },
  {
    phase: 4,
    title: 'Delivered',
    body: 'Order complete',
  },
] as const;

export function isOrderStatus(status: string): status is OrderStatus {
  return ORDER_STATUS_OPTIONS.includes(status as OrderStatus);
}

export function statusLabel(status: string | null | undefined) {
  if (!status) return 'Unknown';
  if (isOrderStatus(status)) return ORDER_STATUS_META[status].label;
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getOrderStatusMeta(status: string | null | undefined): OrderStatusMeta {
  if (status && isOrderStatus(status)) return ORDER_STATUS_META[status];
  return {
    label: statusLabel(status),
    customerDescription: 'Order status is being reviewed.',
    adminDescription: 'Custom or legacy status.',
    phase: 0,
    badgeClass: 'bg-[#f7f1df]/10 text-[#f7f1df]',
  };
}
