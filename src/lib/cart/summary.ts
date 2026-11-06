"use server";

import { getCartLines, getPromoCode } from "@/lib/cart/actions";
import { getActivePromotions, getStoreSettings } from "@/lib/catalog/queries";
import { computeTotals } from "@/lib/pricing/cart-total";
import type { CartLine } from "@/lib/types";

export async function getCartSummary() {
  const [lines, code, promotions, settings] = await Promise.all([
    getCartLines(),
    getPromoCode(),
    getActivePromotions(),
    getStoreSettings(),
  ]);
  const totals = computeTotals(
    lines,
    promotions,
    {
      flat_shipping_minor: settings.flat_shipping_minor,
      free_shipping_threshold_minor: settings.free_shipping_threshold_minor,
      tax_rate_bps: settings.tax_rate_bps,
    },
    code,
  );
  return {
    lines,
    totals,
    code,
    currency: settings.currency,
    freeShippingThreshold: settings.free_shipping_threshold_minor,
  };
}

export type CartSummary = {
  lines: CartLine[];
  totals: Awaited<ReturnType<typeof getCartSummary>>["totals"];
  code: string | null;
  currency: string;
  freeShippingThreshold: number | null;
};
