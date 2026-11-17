"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/pricing/money";
import { requestQuote } from "@/lib/quotes/actions";
import { QUOTE_MAX_QTY } from "@/lib/quotes/rules";

type Line = { variant_id: string; name: string; sku: string; unit_price_minor: number; quantity: number };

const input = "w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30";

export function QuoteRequestForm({ lines, currency, defaults }: { lines: Line[]; currency: string; defaults: { contact_name: string; email: string } }) {
  const [qtys, setQtys] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.variant_id, String(l.quantity)])));
  const [form, setForm] = useState({ contact_name: defaults.contact_name, company: "", email: defaults.email, phone: "", notes: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const qtyOf = (id: string) => Math.min(QUOTE_MAX_QTY, Math.max(0, Math.floor(Number(qtys[id]) || 0)));
  const listTotal = lines.reduce((sum, l) => sum + qtyOf(l.variant_id) * l.unit_price_minor, 0);
  const units = lines.reduce((sum, l) => sum + qtyOf(l.variant_id), 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestQuote({ ...form, qtys: Object.fromEntries(lines.map((l) => [l.variant_id, qtyOf(l.variant_id)])) });
      if (res.ok) setDone(res.quoteNumber);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div role="status" className="mt-8 rounded-2xl border border-line bg-paper-2 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand" aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-semibold">Request sent</h2>
        <p className="mt-2 text-ink-soft">Your reference is <strong className="text-ink">{done}</strong>. We&apos;ve emailed a copy to {form.email} and will reply with prices within one working day.</p>
        <Link href="/products"><Button className="mt-5" variant="outline">Keep browsing</Button></Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <section aria-labelledby="quote-items-h">
        <h2 id="quote-items-h" className="mb-3 font-medium">Items <span className="text-ink-soft">({units.toLocaleString("en-LK")} units)</span></h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {lines.map((l) => (
            <li key={l.variant_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{l.name}</span>
                <span className="text-ink-soft">{l.sku} · list {formatMoney(l.unit_price_minor, currency)} each</span>
              </span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Quantity for {l.name}</span>
                <input type="number" inputMode="numeric" min={0} max={QUOTE_MAX_QTY} step={1} value={qtys[l.variant_id]}
                  onChange={(e) => setQtys((q) => ({ ...q, [l.variant_id]: e.target.value }))}
                  className="w-24 rounded-xl border border-line bg-paper px-3 py-1.5 text-right tabular-nums outline-none focus:ring-2 focus:ring-brand/30" />
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">At list prices: <strong className="text-ink">{formatMoney(listTotal, currency)}</strong>. Set a line to 0 to leave it out.</p>
      </section>

      <section aria-labelledby="quote-contact-h" className="space-y-3">
        <h2 id="quote-contact-h" className="font-medium">Your details</h2>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Name</span><input required value={form.contact_name} onChange={set("contact_name")} className={input} autoComplete="name" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Company / school (optional)</span><input value={form.company} onChange={set("company")} className={input} autoComplete="organization" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Email</span><input required type="email" value={form.email} onChange={set("email")} className={input} autoComplete="email" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Phone (optional)</span><input type="tel" value={form.phone} onChange={set("phone")} className={input} autoComplete="tel" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Notes (delivery date, branding, invoicing…)</span><textarea rows={4} maxLength={1000} value={form.notes} onChange={set("notes")} className={input} /></label>
        <div aria-hidden className="absolute -left-[9999px]"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label></div>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending || units === 0}>{pending ? "Sending…" : "Request quote"}</Button>
      </section>
    </form>
  );
}
