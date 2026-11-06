import { Check } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const FLOW: { key: OrderStatus; label: string }[] = [
  { key: "paid", label: "Paid" },
  { key: "fulfilled", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const ORDER_INDEX: Record<string, number> = { paid: 0, fulfilled: 1, shipped: 2, delivered: 3 };

export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded" || status === "partially_refunded") {
    return <p className="rounded-xl bg-paper-2 px-4 py-3 text-sm font-medium capitalize text-ink-soft">{status.replace("_", " ")}</p>;
  }
  if (status === "pending_payment") {
    return <p className="rounded-xl bg-gold/15 px-4 py-3 text-sm font-medium text-gold">Awaiting payment</p>;
  }
  const current = ORDER_INDEX[status] ?? 0;
  return (
    <ol className="flex items-center">
      {FLOW.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${done ? "border-mint bg-mint text-white" : "border-line text-ink-soft"}`}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`text-xs ${done ? "text-ink" : "text-ink-soft"}`}>{step.label}</span>
            </div>
            {i < FLOW.length - 1 && <span className={`mx-1 h-0.5 flex-1 ${i < current ? "bg-mint" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
