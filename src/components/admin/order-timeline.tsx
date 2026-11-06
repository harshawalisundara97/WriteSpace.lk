import { CheckCircle2, Package, Truck, CreditCard, RotateCcw, FileText, Circle } from "lucide-react";
import type { ReactNode } from "react";

export interface ActivityItem { id: string; action: string; after: unknown; created_at: string }

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function describe(a: ActivityItem): { label: string; icon: ReactNode } {
  const status = (a.after as { status?: string } | null)?.status;
  switch (a.action) {
    case "order.placed": return { label: "Order placed", icon: <FileText className="h-4 w-4" /> };
    case "order.paid": return { label: "Payment received", icon: <CreditCard className="h-4 w-4" /> };
    case "order.refund": return { label: "Refund issued", icon: <RotateCcw className="h-4 w-4" /> };
    case "order.note": return { label: "Note updated", icon: <FileText className="h-4 w-4" /> };
    case "order.tracking": return { label: "Tracking added", icon: <Truck className="h-4 w-4" /> };
    case "order.transition":
      if (status === "fulfilled") return { label: "Order packed", icon: <Package className="h-4 w-4" /> };
      if (status === "shipped") return { label: "Order shipped", icon: <Truck className="h-4 w-4" /> };
      if (status === "delivered") return { label: "Order delivered", icon: <CheckCircle2 className="h-4 w-4" /> };
      if (status === "cancelled") return { label: "Order cancelled", icon: <Circle className="h-4 w-4" /> };
      return { label: `Status → ${status ?? "updated"}`, icon: <Circle className="h-4 w-4" /> };
    default: return { label: a.action, icon: <Circle className="h-4 w-4" /> };
  }
}

export function OrderTimeline({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) return <p className="text-sm text-ink-soft">No activity recorded.</p>;
  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[9px] top-1 bottom-1 w-px bg-line" />
      {activity.map((a) => {
        const { label, icon } = describe(a);
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-6 grid h-5 w-5 place-items-center rounded-full bg-brand text-paper">{icon}</span>
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="text-xs text-ink-soft">{fmt(a.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
