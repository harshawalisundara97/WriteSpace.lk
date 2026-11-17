"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { formatMoney } from "@/lib/pricing/money";
import { quoteTotals, QUOTE_DEFAULT_VALID_DAYS, type QuoteStatus } from "@/lib/quotes/rules";
import { saveQuotePrices, sendQuote, declineQuote } from "@/lib/admin/quote-actions";
import type { AdminQuoteItem } from "@/lib/admin/quote-queries";

const toMajor = (m: number | null) => (m == null ? "" : (m / 100).toFixed(2));
const toMinor = (s: string) => (s.trim() === "" ? null : Math.round(Number(s) * 100));
const cell = "w-28 rounded-lg border border-line bg-paper px-2 py-1.5 text-right tabular-nums outline-none focus:ring-2 focus:ring-brand/30";

export function QuotePricer({ quoteId, status, items, shippingMinor, adminNotes }: {
  quoteId: string; status: QuoteStatus; items: AdminQuoteItem[]; shippingMinor: number; adminNotes: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const editable = status === "requested" || status === "priced" || status === "expired";
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.id, toMajor(i.quoted_unit_minor)])));
  const [shipping, setShipping] = useState(toMajor(shippingMinor) || "0.00");
  const [days, setDays] = useState(String(QUOTE_DEFAULT_VALID_DAYS));
  const [notes, setNotes] = useState(adminNotes);
  const [pct, setPct] = useState("10");

  const lines = items.map((i) => ({ ...i, quoted_unit_minor: toMinor(prices[i.id] ?? "") }));
  const totals = quoteTotals(lines, toMinor(shipping) ?? 0);
  const invalid = lines.some((l) => l.quoted_unit_minor != null && (!Number.isFinite(l.quoted_unit_minor) || l.quoted_unit_minor < 0));
  const payload = () => ({
    quote_id: quoteId,
    lines: lines.map((l) => ({ id: l.id, quoted_unit_minor: l.quoted_unit_minor })),
    shipping_minor: toMinor(shipping) ?? 0, valid_days: Math.round(Number(days) || 0), admin_notes: notes,
  });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => start(async () => {
    const r = await fn();
    if (r.ok) { toast(okMsg); router.refresh(); } else toast(r.error ?? "Something went wrong", "error");
  });
  const applyDiscount = () => {
    const f = 1 - Math.min(100, Math.max(0, Number(pct) || 0)) / 100;
    setPrices(Object.fromEntries(items.map((i) => [i.id, toMajor(Math.round(i.list_unit_minor * f))])));
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Pricing</h2>
        {editable && (
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-ink-soft">Fill all at list −
              <input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} className="w-16 rounded-lg border border-line bg-paper px-2 py-1 text-right" />%
            </label>
            <Button type="button" size="sm" variant="outline" onClick={applyDiscount}>Apply</Button>
          </div>
        )}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-soft">
            <tr><th className="py-2">Item</th><th className="text-right">Qty</th><th className="text-right">In stock</th><th className="text-right">List</th><th className="text-right">Quoted (LKR)</th><th className="text-right">Line</th></tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="py-2 pr-3">{l.name}<span className="block text-xs text-ink-soft">{l.sku}</span></td>
                <td className="text-right tabular-nums">{l.qty.toLocaleString("en-LK")}</td>
                <td className={`text-right tabular-nums ${l.available != null && l.available < l.qty ? "font-medium text-accent" : "text-ink-soft"}`}>{l.available ?? "—"}</td>
                <td className="text-right tabular-nums text-ink-soft">{formatMoney(l.list_unit_minor, "LKR")}</td>
                <td className="py-2 text-right">
                  {editable
                    ? <input aria-label={`Quoted unit price for ${l.name}`} inputMode="decimal" value={prices[l.id]} placeholder={toMajor(l.list_unit_minor)}
                        onChange={(e) => setPrices((p) => ({ ...p, [l.id]: e.target.value }))} className={cell} />
                    : <span className="tabular-nums">{l.quoted_unit_minor == null ? "—" : formatMoney(l.quoted_unit_minor, "LKR")}</span>}
                </td>
                <td className="text-right tabular-nums">{formatMoney(l.qty * (l.quoted_unit_minor ?? l.list_unit_minor), "LKR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block text-ink-soft">Delivery (LKR)</span>
            <input inputMode="decimal" value={shipping} disabled={!editable} onChange={(e) => setShipping(e.target.value)} className={cell} /></label>
          <label className="block text-sm"><span className="mb-1 block text-ink-soft">Valid for (days)</span>
            <input type="number" min={1} max={90} value={days} disabled={!editable} onChange={(e) => setDays(e.target.value)} className={cell} /></label>
          <label className="block text-sm"><span className="mb-1 block text-ink-soft">Internal notes (not sent)</span>
            <textarea rows={3} maxLength={1000} value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30" /></label>
        </div>
        <dl className="space-y-1 self-end text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">At list prices</dt><dd className="tabular-nums">{formatMoney(totals.list_subtotal_minor, "LKR")}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Quoted subtotal</dt><dd className="tabular-nums">{formatMoney(totals.subtotal_minor, "LKR")}</dd></div>
          {totals.savings_minor > 0 && <div className="flex justify-between text-green-700"><dt>Buyer saves</dt><dd className="tabular-nums">{formatMoney(totals.savings_minor, "LKR")}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="font-display text-lg tabular-nums">{formatMoney(totals.total_minor, "LKR")}</dd></div>
        </dl>
      </div>

      {editable && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button disabled={pending || invalid} onClick={() => run(() => sendQuote(payload()), status === "requested" ? "Quote sent" : "Quote re-sent")}>
            {status === "requested" ? "Send quote" : "Re-send quote"}
          </Button>
          <Button variant="outline" disabled={pending || invalid} onClick={() => run(() => saveQuotePrices(payload()), "Draft saved")}>Save draft</Button>
          <Button variant="ghost" disabled={pending} className="ml-auto text-accent"
            onClick={() => { if (confirm("Decline this quote? The buyer won't be able to accept it.")) run(() => declineQuote(quoteId), "Quote declined"); }}>
            Decline
          </Button>
        </div>
      )}
    </Card>
  );
}
