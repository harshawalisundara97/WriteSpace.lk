"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/store/status-badge";
import { trackOrder, type TrackedOrder } from "@/lib/orders/track-actions";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const TERMINAL_COPY = {
  cancelled: "This order was cancelled.",
  refunded: "This order was refunded.",
  partially_refunded: "Part of this order was refunded.",
} as const;

export function TrackOrderClient({ initialOrderNumber = "" }: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await trackOrder({ orderNumber, contact });
      if (res.ok) { setOrder(res.order); setError(null); }
      else { setOrder(null); setError(res.error); }
    });
  }

  const input = "h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-brand";

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-paper p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Order number</span>
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required
            autoComplete="off" placeholder="WS-20261106-1042" className={`${input} font-mono uppercase`} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Email or phone</span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} required
            autoComplete="email" placeholder="you@example.com or 077 123 4567" className={input} />
        </label>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Looking up…" : "Track order"}</Button>
      </form>

      {order && (
        <section aria-live="polite" className="space-y-6 rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-ink-soft">{order.orderNumber}</p>
              <p className="text-xs text-ink-soft">
                Placed {fmt(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                {order.paymentMethod === "cod" && " · Cash on delivery"}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {order.timeline.terminal && (
            <p className="rounded-xl bg-ink/5 px-4 py-3 text-sm text-ink">
              {TERMINAL_COPY[order.timeline.terminal.status]}
              {order.timeline.terminal.at && <span className="text-ink-soft"> ({fmt(order.timeline.terminal.at)})</span>}
            </p>
          )}

          <ol className="space-y-0">
            {order.timeline.steps.map((s, i) => (
              <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < order.timeline.steps.length - 1 && (
                  <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${s.done && order.timeline.steps[i + 1].done ? "bg-mint" : "bg-line"}`} />
                )}
                <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${s.done ? "border-mint bg-mint text-white" : "border-line bg-paper"}`}>
                  {s.done && <Check className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <div>
                  <p className={`text-sm ${s.done ? "font-medium text-ink" : "text-ink-soft"}`}>
                    {s.label}<span className="sr-only">{s.done ? " (done)" : " (pending)"}</span>
                  </p>
                  {s.at && <p className="text-xs text-ink-soft">{fmt(s.at)}</p>}
                </div>
              </li>
            ))}
          </ol>

          {(order.courier || order.trackingNumber) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <Truck className="h-5 w-5 text-brand" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-ink">{order.courier ?? "Courier"}</p>
                {order.trackingNumber && <p className="font-mono text-xs text-ink-soft">{order.trackingNumber}</p>}
              </div>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                  Track with courier <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
