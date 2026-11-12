"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/settings-actions";
import { useToast } from "@/components/admin/toast";
import { toMinor, toMajor } from "@/lib/pricing/money";

type S = {
  store_name: string; currency: string; flat_shipping_minor: number;
  free_shipping_threshold_minor: number | null; tax_rate_bps: number; support_email: string | null;
  support_phone: string | null; whatsapp: string | null; address: string | null;
  instagram_url: string | null; facebook_url: string | null;
};
export function SettingsForm({ initial }: { initial: S }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [storeName, setStoreName] = useState(initial.store_name);
  const [currency, setCurrency] = useState(initial.currency);
  const [shipping, setShipping] = useState(String(toMajor(initial.flat_shipping_minor)));
  const [freeThreshold, setFreeThreshold] = useState(initial.free_shipping_threshold_minor != null ? String(toMajor(initial.free_shipping_threshold_minor)) : "");
  const [taxPct, setTaxPct] = useState(String(initial.tax_rate_bps / 100));
  const [email, setEmail] = useState(initial.support_email ?? "");
  const [phone, setPhone] = useState(initial.support_phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [instagram, setInstagram] = useState(initial.instagram_url ?? "");
  const [facebook, setFacebook] = useState(initial.facebook_url ?? "");

  function save() {
    start(async () => {
      const res = await updateSettings({
        store_name: storeName, currency: currency.toUpperCase(),
        flat_shipping_minor: toMinor(Number(shipping || 0)),
        free_shipping_threshold_minor: freeThreshold ? toMinor(Number(freeThreshold)) : null,
        tax_rate_bps: Math.round(Number(taxPct || 0) * 100),
        support_email: email || "",
        support_phone: phone || "", whatsapp: whatsapp || "", address: address || "",
        instagram_url: instagram || "", facebook_url: facebook || "",
      });
      toast(res.ok ? "Settings saved" : res.error ?? "Could not save", res.ok ? "success" : "error");
    });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Section title="Store identity" hint="Shown across the storefront and in the browser tab.">
        <Inp label="Store name" value={storeName} onChange={setStoreName} />
        <Inp label="Currency (3-letter)" value={currency} onChange={setCurrency} />
      </Section>

      <Section title="Shipping & tax" hint="Applied at checkout by the pricing engine.">
        <Inp label="Flat shipping (LKR)" value={shipping} onChange={setShipping} type="number" />
        <Inp label="Free shipping over (LKR, blank = never)" value={freeThreshold} onChange={setFreeThreshold} type="number" />
        <Inp label="Tax rate (%)" value={taxPct} onChange={setTaxPct} type="number" />
      </Section>

      <Section title="Contact & social" hint="Displayed in the storefront footer. Leave blank to hide.">
        <Inp label="Support email" value={email} onChange={setEmail} type="email" />
        <Inp label="Support phone" value={phone} onChange={setPhone} />
        <Inp label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} />
        <Inp label="Address" value={address} onChange={setAddress} />
        <Inp label="Instagram URL" value={instagram} onChange={setInstagram} />
        <Inp label="Facebook URL" value={facebook} onChange={setFacebook} />
      </Section>

      <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
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
