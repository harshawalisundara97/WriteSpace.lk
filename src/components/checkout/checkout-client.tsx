"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/pricing/money";
import { createCheckout } from "@/lib/checkout/actions";
import type { AddressInput } from "@/lib/validation/checkout";
import { DEFAULT_DELIVERY_METHOD, deliveryMethod, type DeliveryMethod, type DeliveryMethodId } from "@/lib/checkout/delivery";
import { SL_DISTRICTS, codEligibility, type CodSettings, type PaymentMethodId } from "@/lib/checkout/cod";
import { GIFT_MESSAGE_MAX, type GiftSettings } from "@/lib/checkout/gift";
import { maxRedeemable, type LoyaltySettings } from "@/lib/loyalty/rules";
import type { CartLine } from "@/lib/types";
import type { SavedAddress } from "@/lib/account/addresses";

// Hosted-checkout gateways (PayHere) expect a top-level form POST.
function redirectToGateway(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

interface Totals {
  subtotal_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; total_minor: number;
}

type DeliveryTotals = Partial<Record<DeliveryMethodId, { shipping_minor: number; total_minor: number }>>;

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
  lines, totals, deliveryTotals, deliveryMethods, currency, publishableKey, siteUrl, savedAddresses, defaultEmail, cod, gift, loyalty,
}: {
  lines: CartLine[]; totals: Totals; deliveryTotals: DeliveryTotals; deliveryMethods: DeliveryMethod[]; currency: string; publishableKey: string | null; siteUrl: string; savedAddresses: SavedAddress[]; defaultEmail: string; cod: CodSettings; gift: GiftSettings;
  /** Present only for a signed-in shopper with loyalty enabled. */
  loyalty?: { settings: LoyaltySettings; balance: number } | null;
}) {
  const router = useRouter();
  const [payment, setPayment] = useState<PaymentMethodId>("online");
  const [district, setDistrict] = useState("");
  const [method, setMethod] = useState<DeliveryMethodId>(
    deliveryMethods.some((m) => m.id === DEFAULT_DELIVERY_METHOD) ? DEFAULT_DELIVERY_METHOD : (deliveryMethods[0]?.id ?? DEFAULT_DELIVERY_METHOD),
  );
  const needsAddress = deliveryMethod(method).needsAddress;
  // Server-computed figures for the chosen method (re-verified in createCheckout).
  const { shipping_minor, total_minor: baseTotal } = deliveryTotals[method] ?? { shipping_minor: totals.shipping_minor, total_minor: totals.total_minor };
  // COD eligibility ignores the district until one is chosen (checked again on submit and server-side).
  const codCheck = codEligibility(cod, { orderTotalMinor: baseTotal, deliveryMethod: method, district: district || SL_DISTRICTS.find((d) => cod.cod_districts.includes(d)) });
  const payCod = payment === "cod" && codCheck.ok;
  const codFee = payCod ? cod.cod_fee_minor : 0;
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const wrap = gift.gift_wrap_enabled && giftWrap;
  const giftFee = wrap ? gift.gift_wrap_fee_minor : 0;
  // Loyalty points — server re-checks balance and cap in createCheckout.
  const maxPoints = loyalty ? maxRedeemable(loyalty.settings, loyalty.balance, totals.subtotal_minor - totals.discount_minor) : 0;
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState(String(maxPoints));
  const points = usePoints ? Math.min(maxPoints, Math.max(0, Math.floor(Number(pointsInput) || 0))) : 0;
  const pointsOff = loyalty ? points * loyalty.settings.loyalty_point_value_minor : 0;
  const total_minor = baseTotal - pointsOff + codFee + giftFee;
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
    const res = await createCheckout({ ...address, delivery_method: method, payment_method: payCod ? "cod" : "online", district, gift_wrap: wrap, gift_message: wrap ? giftMessage : "", loyalty_points: points });
    setLoading(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong"); return; }
    setOrderId(res.orderId ?? null);
    if (res.provider === "cod" && res.orderId) {
      setLoading(true);
      router.push(`/checkout/confirmation/${res.orderId}`);
      return;
    }
    if (res.redirectUrl && res.redirectFields) {
      redirectToGateway(res.redirectUrl, res.redirectFields);
      setLoading(true); // keep the button busy while the browser leaves
      return;
    }
    if (res.clientSecret) setClientSecret(res.clientSecret);
    else setError("Payment is not configured. Add your payment gateway keys to continue.");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        {!clientSecret ? (
          <form onSubmit={submitAddress} className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Delivery method</h2>
            <fieldset className="grid gap-3">
              <legend className="sr-only">Delivery method</legend>
              {deliveryMethods.map((m) => {
                const fee = deliveryTotals[m.id]?.shipping_minor ?? 0;
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
            {needsAddress && payCod && (
              <label className="block">
                <span className="mb-1 block text-sm text-ink-soft">District</span>
                <select
                  value={district} required onChange={(e) => setDistrict(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Select your district</option>
                  {SL_DISTRICTS.map((d) => (
                    <option key={d} value={d} disabled={!cod.cod_districts.includes(d)}>
                      {d}{cod.cod_districts.includes(d) ? "" : " — COD not available"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Field label="Order notes (optional)" value={address.notes ?? ""} onChange={(v) => set("notes", v)} />
            {gift.gift_wrap_enabled && (
              <div className={`rounded-xl border p-4 transition-colors ${wrap ? "border-brand bg-paper-2" : "border-line bg-paper"}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="h-4 w-4 accent-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Gift wrap this order</span>
                    <span className="block text-sm text-ink-soft">Wrapped by hand, prices left off the packing slip</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium">{gift.gift_wrap_fee_minor === 0 ? "Free" : `+ ${formatMoney(gift.gift_wrap_fee_minor, currency)}`}</span>
                </label>
                {wrap && (
                  <label className="mt-3 block">
                    <span className="mb-1 flex justify-between text-sm text-ink-soft"><span>Gift message (optional)</span><span className="tabular-nums">{giftMessage.length}/{GIFT_MESSAGE_MAX}</span></span>
                    <textarea
                      value={giftMessage} maxLength={GIFT_MESSAGE_MAX} rows={3} onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Happy birthday! Love, Amma"
                      className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                )}
              </div>
            )}
            {loyalty && loyalty.balance > 0 && (
              <div className={`rounded-xl border p-4 transition-colors ${points > 0 ? "border-brand bg-paper-2" : "border-line bg-paper"}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={usePoints} disabled={maxPoints === 0} onChange={(e) => setUsePoints(e.target.checked)} className="h-4 w-4 accent-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Use loyalty points</span>
                    <span className="block text-sm text-ink-soft">
                      {maxPoints === 0
                        ? `You have ${loyalty.balance} pts — not usable on this order`
                        : `You have ${loyalty.balance} pts · up to ${maxPoints} usable here (${loyalty.settings.loyalty_max_redeem_pct}% of items)`}
                    </span>
                  </span>
                  {points > 0 && <span className="shrink-0 text-sm font-medium">− {formatMoney(pointsOff, currency)}</span>}
                </label>
                {usePoints && maxPoints > 0 && (
                  <label className="mt-3 flex items-center gap-3 text-sm">
                    <span className="text-ink-soft">Points to use</span>
                    <input
                      type="number" inputMode="numeric" min={0} max={maxPoints} step={1} value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      onBlur={() => setPointsInput(String(points))}
                      className="w-28 rounded-xl border border-line bg-paper px-3 py-1.5 tabular-nums outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                )}
              </div>
            )}
            {cod.cod_enabled && (
              <>
                <h2 className="pt-2 font-display text-xl font-semibold">Payment</h2>
                <fieldset className="grid gap-3">
                  <legend className="sr-only">Payment method</legend>
                  <PayOption id="online" active={!payCod} onPick={setPayment} label="Pay online" note="Card or other online payment" fee="" />
                  <PayOption
                    id="cod" active={payCod} onPick={setPayment} disabled={!codCheck.ok}
                    label={method === "pickup" ? "Pay at the store" : "Cash on delivery"}
                    note={codCheck.ok ? (method === "pickup" ? "Pay in cash when you collect" : "Pay the courier in cash") : codCheck.reason}
                    fee={cod.cod_fee_minor === 0 ? "No fee" : `+ ${formatMoney(cod.cod_fee_minor, currency)}`}
                  />
                </fieldset>
              </>
            )}
            {error && <p className="text-sm text-accent">{error}</p>}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Setting up…" : payCod ? "Place order" : "Continue to payment"}
            </Button>
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
          {pointsOff > 0 && <Row label={`Loyalty points (${points})`} value={`− ${formatMoney(pointsOff, currency)}`} />}
          {codFee > 0 && <Row label="Cash on delivery fee" value={formatMoney(codFee, currency)} />}
          {wrap && <Row label="Gift wrap" value={giftFee === 0 ? "Free" : formatMoney(giftFee, currency)} />}
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

function PayOption({ id, active, onPick, label, note, fee, disabled }: {
  id: PaymentMethodId; active: boolean; onPick: (id: PaymentMethodId) => void; label: string; note: string; fee: string; disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand/30 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${active ? "border-brand bg-paper-2" : "border-line bg-paper hover:bg-paper-2"}`}
    >
      <input
        type="radio" name="payment_method" value={id} checked={active} disabled={disabled}
        onChange={() => onPick(id)} className="h-4 w-4 accent-brand"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-ink-soft">{note}</span>
      </span>
      {fee && <span className="shrink-0 text-sm font-medium">{fee}</span>}
    </label>
  );
}
