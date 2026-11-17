import type { OrderStatus } from "@/lib/types";
import type { PaymentMethodId } from "@/lib/checkout/cod";

/** Checkout methods plus "invoice" (B2B quotes, TASK-NEXT-009d — never offered at checkout). */
export type OrderPaymentMethod = PaymentMethodId | "invoice";

// Allowed order status transitions. Any change not listed here is rejected.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["fulfilled", "cancelled", "refunded", "partially_refunded"],
  fulfilled: ["shipped", "cancelled", "refunded", "partially_refunded"],
  shipped: ["delivered", "refunded", "partially_refunded"],
  delivered: ["refunded", "partially_refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  cancelled: [],
};

// Cash on delivery (TASK-NEXT-002): the order is fulfilled while still awaiting
// payment; cash is collected on delivery. A refused delivery cancels it.
const COD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  ...TRANSITIONS,
  pending_payment: ["fulfilled", "cancelled"],
  fulfilled: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
};

// Invoice (B2B): like COD — fulfil and ship before payment — but staff can also
// mark it paid up front when the transfer arrives before dispatch.
const INVOICE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  ...COD_TRANSITIONS,
  pending_payment: ["paid", "fulfilled", "cancelled"],
};

function table(method: OrderPaymentMethod) {
  return method === "cod" ? COD_TRANSITIONS : method === "invoice" ? INVOICE_TRANSITIONS : TRANSITIONS;
}

/** Stock is committed before payment (COD, invoice): a cancel must put it back. */
export function commitsStockBeforePayment(method: OrderPaymentMethod): boolean {
  return method === "cod" || method === "invoice";
}

export function canTransition(from: OrderStatus, to: OrderStatus, method: OrderPaymentMethod = "online"): boolean {
  return table(method)[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus, method: OrderPaymentMethod = "online"): OrderStatus[] {
  return table(method)[from] ?? [];
}

export function assertTransition(from: OrderStatus, to: OrderStatus, method: OrderPaymentMethod = "online"): void {
  if (!canTransition(from, to, method)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}
