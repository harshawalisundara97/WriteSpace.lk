import type { QuoteStatus } from "@/lib/quotes/rules";

const STYLE: Record<QuoteStatus, string> = {
  requested: "bg-amber-100 text-amber-900",
  priced: "bg-indigo-100 text-indigo-900",
  accepted: "bg-emerald-100 text-emerald-900",
  converted: "bg-emerald-200 text-emerald-950",
  declined: "bg-stone-200 text-stone-700",
  expired: "bg-stone-200 text-stone-700",
};
const LABEL: Record<QuoteStatus, string> = {
  requested: "Needs pricing", priced: "Sent", accepted: "Accepted", converted: "Ordered", declined: "Declined", expired: "Expired",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>{LABEL[status]}</span>;
}
