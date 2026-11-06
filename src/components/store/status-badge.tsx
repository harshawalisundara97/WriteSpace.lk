import type { OrderStatus } from "@/lib/types";

const MAP: Record<OrderStatus, string> = {
  pending_payment: "bg-gold/15 text-gold",
  paid: "bg-mint/15 text-mint",
  fulfilled: "bg-brand/10 text-brand",
  shipped: "bg-brand/10 text-brand",
  delivered: "bg-mint/15 text-mint",
  cancelled: "bg-ink/10 text-ink-soft",
  refunded: "bg-accent/15 text-accent",
  partially_refunded: "bg-accent/15 text-accent",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${MAP[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
