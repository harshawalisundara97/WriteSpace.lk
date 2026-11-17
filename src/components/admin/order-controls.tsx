"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/store/status-badge";
import { transitionOrder, setTracking, createRefund, markInvoicePaid } from "@/lib/admin/order-actions";
import { nextStatuses } from "@/lib/orders/state-machine";
import { COURIERS, type CourierId } from "@/lib/orders/tracking";
import { formatMoney, toMinor } from "@/lib/pricing/money";
import type { OrderStatus } from "@/lib/types";

export function OrderControls({
  orderId, status, totalMinor, currency, tracking, courier = null, trackingUrl = null, canRefund, paymentMethod = "online", invoicePaid = false,
}: {
  orderId: string; status: OrderStatus; totalMinor: number; currency: string;
  tracking: string | null; courier?: string | null; trackingUrl?: string | null;
  canRefund: boolean; paymentMethod?: "online" | "cod" | "invoice";
  /** Invoice orders: has the bank transfer been recorded? */
  invoicePaid?: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [trackInput, setTrackInput] = useState(tracking ?? "");
  const [courierInput, setCourierInput] = useState(courier ?? "");
  const [urlInput, setUrlInput] = useState(trackingUrl ?? "");
  const [refundAmount, setRefundAmount] = useState((totalMinor / 100).toString());
  const [refundReason, setRefundReason] = useState("");
  const [restock, setRestock] = useState(true);

  const transitions = nextStatuses(status, paymentMethod).filter((s) => s !== "refunded" && s !== "partially_refunded");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) toast(okMsg);
      else toast(res.error ?? "Failed", "error");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-soft">Status</span>
        <StatusBadge status={status} />
        {paymentMethod === "cod" && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium">
            Cash on delivery{status === "pending_payment" || status === "fulfilled" || status === "shipped" ? " · collect on delivery" : ""}
          </span>
        )}
        {paymentMethod === "invoice" && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium">Invoice (bank transfer) · {invoicePaid ? "paid" : "unpaid"}</span>
        )}
      </div>

      {paymentMethod === "invoice" && !invoicePaid && status !== "cancelled" && (
        <Button size="sm" disabled={pending}
          onClick={() => { if (confirm("Record that the bank transfer for this invoice has arrived?")) run(() => markInvoicePaid(orderId), "Invoice marked paid"); }}>
          Mark invoice paid
        </Button>
      )}

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
        <p className="mb-2 text-sm font-medium">Courier tracking</p>
        <p className="mb-2 text-xs text-ink-soft">Shown to the customer on the public <span className="font-mono">/track</span> page.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={courierInput} onChange={(e) => setCourierInput(e.target.value)} aria-label="Courier"
            className="h-10 rounded-xl border border-line bg-paper px-3 text-sm outline-none">
            <option value="">Courier…</option>
            {COURIERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={trackInput} onChange={(e) => setTrackInput(e.target.value)} aria-label="Tracking number"
            className="h-10 rounded-xl border border-line bg-paper px-3 text-sm outline-none" placeholder="Tracking no., e.g. LK123456789" />
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} aria-label="Tracking link" type="url"
            className="h-10 rounded-xl border border-line bg-paper px-3 text-sm outline-none sm:col-span-2" placeholder="Tracking link (optional), https://…" />
        </div>
        <Button size="sm" variant="outline" className="mt-2" disabled={pending}
          onClick={() => run(() => setTracking(orderId, { tracking_number: trackInput, courier: courierInput as CourierId | "", tracking_url: urlInput }), "Tracking saved")}>Save tracking</Button>
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
    </div>
  );
}
