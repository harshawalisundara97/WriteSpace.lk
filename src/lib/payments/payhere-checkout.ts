// Pure PayHere hosted-checkout helpers (no server-only import so they are unit
// testable). Spec: https://support.payhere.lk/api-&-mobile-sdk/checkout-api
import { createHash } from "node:crypto";

export const PAYHERE_CHECKOUT_URL = {
  sandbox: "https://sandbox.payhere.lk/pay/checkout",
  live: "https://www.payhere.lk/pay/checkout",
} as const;

const md5Upper = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

/** Integer minor units → PayHere amount string with exactly two decimals. */
export function formatPayhereAmount(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new Error("Invalid amount");
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, "0")}`;
}

/** hash = UPPER(md5(merchant_id + order_id + amount + currency + UPPER(md5(secret)))) */
export function payhereCheckoutHash(p: {
  merchantId: string; orderId: string; amountMinor: number; currency: string; merchantSecret: string;
}): string {
  return md5Upper(
    p.merchantId + p.orderId + formatPayhereAmount(p.amountMinor) + p.currency + md5Upper(p.merchantSecret),
  );
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  const first = parts.shift() ?? "";
  return { first, last: parts.join(" ") || first };
}

export interface PayhereCheckoutInput {
  merchantId: string;
  merchantSecret: string;
  siteUrl: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  customer: { fullName: string; email: string; phone: string; address: string; city: string; country: string };
}

/** Form fields to POST to the PayHere checkout URL. */
export function buildPayhereFields(i: PayhereCheckoutInput): Record<string, string> {
  const { first, last } = splitName(i.customer.fullName);
  const site = i.siteUrl.replace(/\/$/, "");
  return {
    merchant_id: i.merchantId,
    return_url: `${site}/checkout/confirmation/${i.orderId}`,
    cancel_url: `${site}/checkout?cancelled=1`,
    notify_url: `${site}/api/webhooks/payhere`,
    order_id: i.orderId,
    items: `WriteSpace order ${i.orderNumber}`,
    currency: i.currency,
    amount: formatPayhereAmount(i.amountMinor),
    first_name: first,
    last_name: last,
    email: i.customer.email,
    phone: i.customer.phone,
    address: i.customer.address || "N/A",
    city: i.customer.city || "N/A",
    country: i.customer.country,
    hash: payhereCheckoutHash({
      merchantId: i.merchantId, orderId: i.orderId, amountMinor: i.amountMinor,
      currency: i.currency, merchantSecret: i.merchantSecret,
    }),
  };
}
