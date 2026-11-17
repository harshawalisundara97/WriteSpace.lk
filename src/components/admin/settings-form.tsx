"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/settings-actions";
import { useToast } from "@/components/admin/toast";
import { toMinor, toMajor } from "@/lib/pricing/money";
import { DELIVERY_METHODS, type DeliverySettings } from "@/lib/checkout/delivery";
import { SL_DISTRICTS, type CodSettings, type District } from "@/lib/checkout/cod";
import type { GiftSettings } from "@/lib/checkout/gift";
import type { LoyaltySettings } from "@/lib/loyalty/rules";

type S = {
  store_name: string; currency: string; flat_shipping_minor: number;
  free_shipping_threshold_minor: number | null; tax_rate_bps: number; support_email: string | null;
  support_phone: string | null; whatsapp: string | null; address: string | null;
  instagram_url: string | null; facebook_url: string | null;
} & DeliverySettings & CodSettings & GiftSettings & LoyaltySettings;
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
  const [expressSurcharge, setExpressSurcharge] = useState(String(toMajor(initial.express_surcharge_minor)));
  const [expressOn, setExpressOn] = useState(initial.express_enabled);
  const [pickupOn, setPickupOn] = useState(initial.pickup_enabled);
  const [codOn, setCodOn] = useState(initial.cod_enabled);
  const [codFee, setCodFee] = useState(String(toMajor(initial.cod_fee_minor)));
  const [codMax, setCodMax] = useState(initial.cod_max_order_minor != null ? String(toMajor(initial.cod_max_order_minor)) : "");
  const [codDistricts, setCodDistricts] = useState<District[]>(initial.cod_districts);
  const [giftOn, setGiftOn] = useState(initial.gift_wrap_enabled);
  const [giftFee, setGiftFee] = useState(String(toMajor(initial.gift_wrap_fee_minor)));
  const [loyaltyOn, setLoyaltyOn] = useState(initial.loyalty_enabled);
  const [earnPer, setEarnPer] = useState(String(toMajor(initial.loyalty_earn_per_minor)));
  const [pointValue, setPointValue] = useState(String(toMajor(initial.loyalty_point_value_minor)));
  const [maxPct, setMaxPct] = useState(String(initial.loyalty_max_redeem_pct));
  const [expiry, setExpiry] = useState(String(initial.loyalty_expiry_months));
  const toggleDistrict = (d: District, on: boolean) =>
    setCodDistricts((cur) => (on ? SL_DISTRICTS.filter((x) => x === d || cur.includes(x)) : cur.filter((x) => x !== d)));
  const [notes, setNotes] = useState({
    standard: initial.standard_description ?? "", express: initial.express_description ?? "", pickup: initial.pickup_description ?? "",
  });

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
        express_surcharge_minor: toMinor(Number(expressSurcharge || 0)),
        express_enabled: expressOn, pickup_enabled: pickupOn,
        standard_description: notes.standard, express_description: notes.express, pickup_description: notes.pickup,
        cod_enabled: codOn, cod_fee_minor: toMinor(Number(codFee || 0)),
        cod_max_order_minor: codMax ? toMinor(Number(codMax)) : null, cod_districts: codDistricts,
        gift_wrap_enabled: giftOn, gift_wrap_fee_minor: toMinor(Number(giftFee || 0)),
        loyalty_enabled: loyaltyOn, loyalty_earn_per_minor: toMinor(Number(earnPer || 0)),
        loyalty_point_value_minor: toMinor(Number(pointValue || 0)),
        loyalty_max_redeem_pct: Math.round(Number(maxPct || 0)), loyalty_expiry_months: Math.round(Number(expiry || 0)),
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

      <Section title="Delivery methods" hint="Standard is always offered. Express = flat shipping + surcharge, never waived. Pickup is free. Leave a note blank to use the default.">
        <Inp label="Express surcharge (LKR)" value={expressSurcharge} onChange={setExpressSurcharge} type="number" />
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Toggle label="Offer express delivery" checked={expressOn} onChange={setExpressOn} />
          <Toggle label="Offer store pickup" checked={pickupOn} onChange={setPickupOn} />
        </div>
        {DELIVERY_METHODS.map((m) => (
          <Inp
            key={m.id} label={`${m.label} note`} placeholder={m.description}
            value={notes[m.id]} onChange={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
          />
        ))}
      </Section>

      <Section title="Cash on delivery" hint="Customers pay the courier in cash. Orders stay awaiting payment until marked delivered. Store pickup orders can always pay at the counter.">
        <div className="flex items-end pb-1 sm:col-span-2">
          <Toggle label="Offer cash on delivery" checked={codOn} onChange={setCodOn} />
        </div>
        <Inp label="COD fee (LKR)" value={codFee} onChange={setCodFee} type="number" />
        <Inp label="Max order value (LKR, blank = no limit)" value={codMax} onChange={setCodMax} type="number" />
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 flex w-full items-center justify-between text-sm text-ink-soft">
            <span>Districts that allow COD ({codDistricts.length}/{SL_DISTRICTS.length})</span>
            <span className="flex gap-3">
              <button type="button" className="underline" onClick={() => setCodDistricts([...SL_DISTRICTS])}>All</button>
              <button type="button" className="underline" onClick={() => setCodDistricts([])}>None</button>
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SL_DISTRICTS.map((d) => (
              <Toggle key={d} label={d} checked={codDistricts.includes(d)} onChange={(on) => toggleDistrict(d, on)} />
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Gift wrap" hint="Shoppers can add gift wrapping and a short message at checkout. The message prints on the packing slip.">
        <div className="flex items-end pb-1">
          <Toggle label="Offer gift wrap" checked={giftOn} onChange={setGiftOn} />
        </div>
        <Inp label="Gift wrap fee per order (LKR)" value={giftFee} onChange={setGiftFee} type="number" />
      </Section>

      <Section title="Loyalty points" hint="Signed-in customers earn points when an order is delivered and spend them at checkout. Rate changes apply to future orders only.">
        <div className="flex items-end pb-1">
          <Toggle label="Run loyalty programme" checked={loyaltyOn} onChange={setLoyaltyOn} />
        </div>
        <Inp label="Spend per 1 point earned (LKR)" value={earnPer} onChange={setEarnPer} type="number" />
        <Inp label="Value of 1 point (LKR)" value={pointValue} onChange={setPointValue} type="number" />
        <Inp label="Max share of items payable with points (%)" value={maxPct} onChange={setMaxPct} type="number" />
        <Inp label="Points expire after (months, 0 = never)" value={expiry} onChange={setExpiry} type="number" />
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3" />
    </label>
  );
}
