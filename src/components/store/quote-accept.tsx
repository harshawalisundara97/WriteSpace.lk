"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptQuote } from "@/lib/quotes/actions";
import { SL_DISTRICTS } from "@/lib/checkout/cod";

const input = "w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30";

export function QuoteAcceptForm({ token, phone }: { token: string; phone: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ line1: "", line2: "", city: "", district: "", postal_code: "", phone, po_number: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await acceptQuote({ token, ...f });
      if (r.ok) router.refresh(); else setError(r.error);
    });
  }

  return (
    <form onSubmit={submit} aria-labelledby="accept-h" className="mt-10 rounded-2xl border border-line p-5">
      <h2 id="accept-h" className="font-display text-xl font-semibold">Accept this quote</h2>
      <p className="mt-1 text-sm text-ink-soft">Tell us where to deliver. We&apos;ll send an invoice for payment by bank transfer.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Delivery address</span><input required value={f.line1} onChange={set("line1")} className={input} autoComplete="address-line1" /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Address line 2 (optional)</span><input value={f.line2} onChange={set("line2")} className={input} autoComplete="address-line2" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">City</span><input required value={f.city} onChange={set("city")} className={input} autoComplete="address-level2" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">District</span>
          <select value={f.district} onChange={set("district")} className={input}>
            <option value="">Select…</option>
            {SL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Postal code (optional)</span><input value={f.postal_code} onChange={set("postal_code")} className={input} autoComplete="postal-code" /></label>
        <label className="block"><span className="mb-1 block text-sm text-ink-soft">Phone for delivery</span><input required type="tel" value={f.phone} onChange={set("phone")} className={input} autoComplete="tel" /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Purchase order number (optional)</span><input value={f.po_number} onChange={set("po_number")} maxLength={60} className={input} /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-accent">{error}</p>}
      <Button type="submit" size="lg" className="mt-4" disabled={pending}>{pending ? "Accepting…" : "Accept quote"}</Button>
    </form>
  );
}
