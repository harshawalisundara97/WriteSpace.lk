"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/settings-actions";
import { toMinor, toMajor } from "@/lib/pricing/money";

type S = {
  store_name: string; currency: string; flat_shipping_minor: number;
  free_shipping_threshold_minor: number | null; tax_rate_bps: number; support_email: string | null;
};

export function SettingsForm({ initial }: { initial: S }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [storeName, setStoreName] = useState(initial.store_name);
  const [currency, setCurrency] = useState(initial.currency);
  const [shipping, setShipping] = useState(String(toMajor(initial.flat_shipping_minor)));
  const [freeThreshold, setFreeThreshold] = useState(initial.free_shipping_threshold_minor != null ? String(toMajor(initial.free_shipping_threshold_minor)) : "");
  const [taxPct, setTaxPct] = useState(String(initial.tax_rate_bps / 100));
  const [email, setEmail] = useState(initial.support_email ?? "");

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateSettings({
        store_name: storeName, currency: currency.toUpperCase(),
        flat_shipping_minor: toMinor(Number(shipping || 0)),
        free_shipping_threshold_minor: freeThreshold ? toMinor(Number(freeThreshold)) : null,
        tax_rate_bps: Math.round(Number(taxPct || 0) * 100),
        support_email: email || "",
      });
      setMsg(res.ok ? "Saved" : res.error ?? "Failed");
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <Inp label="Store name" value={storeName} onChange={setStoreName} />
      <Inp label="Currency (3-letter)" value={currency} onChange={setCurrency} />
      <Inp label="Flat shipping (LKR)" value={shipping} onChange={setShipping} type="number" />
      <Inp label="Free shipping over (LKR, blank = never)" value={freeThreshold} onChange={setFreeThreshold} type="number" />
      <Inp label="Tax rate (%)" value={taxPct} onChange={setTaxPct} type="number" />
      <Inp label="Support email" value={email} onChange={setEmail} type="email" />
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
        {msg && <span className="text-sm text-ink-soft">{msg}</span>}
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3" />
    </label>
  );
}
