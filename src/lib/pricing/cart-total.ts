// Final cart math: subtotal -> discount -> shipping -> tax -> total.
// Pure and unit-testable. Integer minor units.

import type { CartLine, Promotion } from "@/lib/types";
import { applyPromotions, type PromoContext, type AppliedPromo } from "./promotions-engine";
import { applyPercent, clampMinor } from "./money";

export interface ShippingTaxSettings {
  flat_shipping_minor: number;
  free_shipping_threshold_minor: number | null;
  /** Tax in basis points. 0 = no tax. */
  tax_rate_bps: number;
}

export interface CartTotals {
  subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  tax_minor: number;
  total_minor: number;
  free_shipping: boolean;
  applied_promos: AppliedPromo[];
}

export function computeTotals(
  lines: CartLine[],
  promotions: Promotion[],
  settings: ShippingTaxSettings,
  enteredCode?: string | null,
  ctx: PromoContext = {},
): CartTotals {
  const promo = applyPromotions(lines, promotions, enteredCode, ctx);
  const discountedSubtotal = clampMinor(promo.subtotal_minor - promo.discount_minor);

  // Shipping: free if a promo grants it, or threshold met, else flat.
  const thresholdMet =
    settings.free_shipping_threshold_minor != null &&
    discountedSubtotal >= settings.free_shipping_threshold_minor;
  const shipping =
    lines.length === 0 || promo.free_shipping || thresholdMet ? 0 : settings.flat_shipping_minor;

  // Tax applied on discounted subtotal (not shipping) — adjust per jurisdiction.
  const tax = settings.tax_rate_bps > 0 ? applyPercent(discountedSubtotal, settings.tax_rate_bps / 100) : 0;

  const total = clampMinor(discountedSubtotal + shipping + tax);

  return {
    subtotal_minor: promo.subtotal_minor,
    discount_minor: promo.discount_minor,
    shipping_minor: shipping,
    tax_minor: tax,
    total_minor: total,
    free_shipping: shipping === 0,
    applied_promos: promo.applied,
  };
}
