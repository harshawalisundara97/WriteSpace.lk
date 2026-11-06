import type { OrderStatus } from "@/lib/types";

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

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}
