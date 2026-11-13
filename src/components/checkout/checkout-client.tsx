"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/pricing/money";
import { createCheckout } from "@/lib/checkout/actions";
import type { AddressInput } from "@/lib/validation/checkout";
import { DELIVERY_METHODS, DEFAULT_DELIVERY_METHOD, deliveryMethod, type DeliveryMethodId } from "@/lib/checkout/delivery";
import type { CartLine } from "@/lib/types";
import type { SavedAddress } from "@/lib/account/addresses";

interface Totals {
  subtotal_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; total_minor: number;
}

type DeliveryTotals = Record<DeliveryMethodId, { shipping_minor: number; total_minor: number }>;

function emptyAddress(email: string): AddressInput {
  return { full_name: "", email, phone: "", line1: "", line2: "", city: "", postal_code: "", country: "LK", notes: "" };
}

// A saved address fills the delivery fields; email (account-level) and order
// notes are kept from the live form.
function addrToInput(a: SavedAddress, email: string): AddressInput {
  return {
    full_name: a.full_name, email, phone: a.phone, line1: a.line1, line2: a.line2 ?? "",
    city: a.city, postal_code: a.postal_code ?? "", country: a.country || "LK", notes: "",
  };
}

export function CheckoutClient({
  lines, totals, deliveryTotals, currency, publishableKey, siteUrl, savedAddresses, defaultEmail,
}: {
  lines: CartLine[]; totals: Totals; deliveryTotals: DeliveryTotals; currency: string; publishableKey: string | null; siteUrl: string; savedAddresses: SavedAddress[]; defaultEmail: string;
}) {
  const [method, setMethod] = useState<DeliveryMethodId>(DEFAULT_DELIVERY_METHOD);
  const needsAddress = deliveryMethod(method).needsAddress;
  // Server-computed figures for the chosen method (re-verified in createCheckout).
  const { shipping_minor, total_minor } = deliveryTotals[method];
  const [address, setAddress] = useState<AddressInput>(() => {
    const def = savedAddresses.find((a) => a.is_default);
    return def ? addrToInput(def, defaultEmail) : emptyAddress(defaultEmail);
  });
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(
    savedAddresses.find((a) => a.is_default)?.id ?? null,
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  function set<K extends keyof AddressInput>(k: K, v: AddressInput[K]) {
    setAddress((a) => ({ ...a, [k]: v }));
  }

  function pickAddress(a: SavedAddress) {
    setSelectedAddrId(a.id);
    setAddress((prev) => ({ ...addrToInput(a, prev.email), notes: prev.notes }));
  }

  function useNewAddress() {
    setSelectedAddrId(null);
    setAddress((prev) => ({ ...emptyAddress(prev.email), notes: prev.notes }));
  }

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await createCheckout({ ...address, delivery_method: method });
    setLoading(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong"); return; }
    setOrderId(res.orderId ?? null);
    if (res.clientSecret) setClientSecret(res.clientSecret);
    else setError("Payment is not configured. Add your Stripe keys to continue.");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        {!clientSecret ? (
          <form onSubmit={submitAddress} className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Delivery method</h2>
            <fieldset className="grid gap-3">
              <legend className="sr-only">Delivery method</legend>
              {DELIVERY_METHODS.map((m) => {
                const fee = deliveryTotals[m.id].shipping_minor;
                const active = method === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand/30 ${active ? "border-brand bg-paper-2" : "border-line bg-paper hover:bg-paper-2"}`}
                  >
                    <input
                      type="radio" name="delivery_method" value={m.id} checked={active}
                      onChange={() => setMethod(m.id)} className="h-4 w-4 accent-brand"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{m.label}</span>
                      <span className="block text-sm text-ink-soft">{m.description}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium">{fee === 0 ? "Free" : formatMoney(fee, currency)}</span>
                  </label>
                );
              })}
            </fieldset>

            {needsAddress && savedAddresses.length > 0 && (
              <div className="space-y-3">
                <h2 className="pt-2 font-display text-xl font-semibold">Saved addresses</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedAddresses.map((a) => {
                    const active = selectedAddrId === a.id;
                    return (
                      <button
                        type="button" key={a.id} onClick={() => pickAddress(a)}
                        className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-brand bg-paper-2" : "border-line bg-paper hover:bg-paper-2"}`}
                      >
                        <span className="block font-medium">{a.label || a.full_name}</span>
                        <span className="mt-0.5 block text-sm text-ink-soft">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button" onClick={useNewAddress}
                    className={`rounded-xl border border-dashed p-4 text-left text-sm transition-colors ${selectedAddrId === null ? "border-brand bg-paper-2 text-ink" : "border-line bg-paper text-ink-soft hover:bg-paper-2"}`}
                  >
                    + Use a new address
                  </button>
                </div>
              </div>
            )}
            <h2 className="pt-2 font-display text-xl font-semibold">{needsAddress ? "Delivery details" : "Your details"}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={address.full_name} onChange={(v) => set("full_name", v)} required />
              <Field label="Email" type="email" value={address.email} onChange={(v) => set("email", v)} required />
              <Field label="Phone" value={address.phone} onChange={(v) => set("phone", v)} required />
              {needsAddress && (
                <>
                  <Field label="City" value={address.city} onChange={(v) => set("city", v)} required />
                  <div className="sm:col-span-2"><Field label="Address" value={address.line1} onChange={(v) => set("line1", v)} required /></div>
                  <div className="sm:col-span-2"><Field label="Address line 2 (optional)" value={address.line2 ?? ""} onChange={(v) => set("line2", v)} /></div>
                  <Field label="Postal code (optional)" value={address.postal_code ?? ""} onChange={(v) => set("postal_code", v)} />
                </>
              )}
            </div>
            <Field label="Order notes (optional)" value={address.notes ?? ""} onChange={(v) => set("notes", v)} />
            {error && <p className="text-sm text-accent">{error}</p>}
            <Button type="submit" size="lg" disabled={loading}>{loading ? "Setting up…" : "Continue to payment"}</Button>
          </form>
        ) : stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "flat" } }}>
            <PaymentForm orderId={orderId!} siteUrl={siteUrl} />
          </Elements>
        ) : (
          <p className="text-sm text-accent">Stripe publishable key missing.</p>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-paper-2 p-5">
        <h3 className="font-display text-lg font-semibold">Order summary</h3>
        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.variant_id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0"><span className="line-clamp-1">{l.product_name}</span><span className="text-ink-soft">×{l.quantity}</span></span>
              <span>{formatMoney(l.unit_price_minor * l.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal_minor, currency)} />
          {totals.discount_minor > 0 && <Row label="Discount" value={`− ${formatMoney(totals.discount_minor, currency)}`} />}
          <Row label={deliveryMethod(method).label} value={shipping_minor === 0 ? "Free" : formatMoney(shipping_minor, currency)} />
          {totals.tax_minor > 0 && <Row label="Tax" value={formatMoney(totals.tax_minor, currency)} />}
        </dl>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
          <span>Total</span><span className="font-display text-lg">{formatMoney(total_minor, currency)}</span>
        </div>
      </aside>
    </div>
  );
}

function PaymentForm({ orderId, siteUrl }: { orderId: string; siteUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${siteUrl}/checkout/confirmation/${orderId}` },
    });
    if (error) { setError(error.message ?? "Payment failed"); setLoading(false); }
  }

  return (
    <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={pay} className="space-y-5">
      <h2 className="font-display text-xl font-semibold">Payment</h2>
      <PaymentElement />
      {error && <p className="text-sm text-accent">{error}</p>}
      <Button type="submit" size="lg" variant="accent" disabled={!stripe || loading} className="w-full">
        {loading ? "Processing…" : "Pay now"}
      </Button>
      <p className="text-xs text-ink-soft">Payments are processed securely by Stripe. Use test card 4242 4242 4242 4242 in test mode.</p>
    </motion.form>
  );
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input
        type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-ink-soft">{label}</dt><dd>{value}</dd></div>;
}
