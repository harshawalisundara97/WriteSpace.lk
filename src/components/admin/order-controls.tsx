"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/store/status-badge";
import { transitionOrder, setTracking, createRefund } from "@/lib/admin/order-actions";
import { nextStatuses } from "@/lib/orders/state-machine";
import { formatMoney, toMinor } from "@/lib/pricing/money";
import type { OrderStatus } from "@/lib/types";

export function OrderControls({
  orderId, status, totalMinor, currency, tracking, canRefund,
}: {
  orderId: string; status: OrderStatus; totalMinor: number; currency: string;
  tracking: string | null; canRefund: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState(tracking ?? "");
  const [refundAmount, setRefundAmount] = useState((totalMinor / 100).toString());
  const [refundReason, setRefundReason] = useState("");
  const [restock, setRestock] = useState(true);

  const transitions = nextStatuses(status).filter((s) => s !== "refunded" && s !== "partially_refunded");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? okMsg : res.error ?? "Failed");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-soft">Status</span>
        <StatusBadge status={status} />
      </div>

      {transitions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Advance status</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map((to) => (
              <Button key={to} size="sm" variant="outline" disabled={pending}
                onClick={() => run(() => transitionOrder(orderId, to), `Moved to ${to.replace(/_/g, " ")}`)}>
                {to === "cancelled" ? "Cancel order" : `Mark ${to}`}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Tracking number</p>
        <div className="flex gap-2">
          <input value={trackInput} onChange={(e) => setTrackInput(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-line bg-paper px-3 text-sm outline-none" placeholder="e.g. LK123456789" />
          <Button size="sm" variant="outline" disabled={pending}
            onClick={() => run(async () => setTracking(orderId, trackInput), "Tracking saved")}>Save</Button>
        </div>
      </div>

      {canRefund && (
        <div className="rounded-xl border border-line p-4">
          <p className="mb-3 text-sm font-medium">Refund</p>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Amount ({currency}), max {formatMoney(totalMinor, currency)}</span>
              <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-paper px-3 outline-none" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Reason</span>
              <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-paper px-3 outline-none" placeholder="Customer request, damaged, …" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="accent-brand" />
              Restock items
            </label>
            <Button size="sm" variant="accent" disabled={pending}
              onClick={() => run(() => createRefund({
                orderId, amountMinor: toMinor(Number(refundAmount)), reason: refundReason, restock,
              }), "Refund processed")}>
              Process refund
            </Button>
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}
