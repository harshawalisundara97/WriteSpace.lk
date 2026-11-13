"use server";

import { getCartLines, getPromoCode } from "@/lib/cart/actions";
import { getActivePromotions, getStoreSettings, getProducts } from "@/lib/catalog/queries";
import { computeTotals } from "@/lib/pricing/cart-total";
import { DELIVERY_METHODS, type DeliveryMethodId } from "@/lib/checkout/delivery";
import type { CartLine } from "@/lib/types";

export interface CrossSellItem {
  productId: string; slug: string; name: string; variantId: string | null;
  price_minor: number; currency: string; imageUrl: string | null;
}

export async function getCartSummary() {
  const [lines, code, promotions, settings, catalog] = await Promise.all([
    getCartLines(),
    getPromoCode(),
    getActivePromotions(),
    getStoreSettings(),
    getProducts({ pageSize: 8, sort: "newest" }),
  ]);
  const shippingTax = {
    flat_shipping_minor: settings.flat_shipping_minor,
    free_shipping_threshold_minor: settings.free_shipping_threshold_minor,
    tax_rate_bps: settings.tax_rate_bps,
  };
  const totals = computeTotals(lines, promotions, shippingTax, code);

  // Server-computed totals per delivery method, so checkout can switch
  // methods without doing any price math on the client.
  const deliveryTotals = Object.fromEntries(
    DELIVERY_METHODS.map((m) => {
      const t = computeTotals(lines, promotions, { ...shippingTax, delivery_method: m.id }, code);
      return [m.id, { shipping_minor: t.shipping_minor, total_minor: t.total_minor }];
    }),
  ) as Record<DeliveryMethodId, { shipping_minor: number; total_minor: number }>;

  const inCart = new Set(lines.map((l) => l.product_id));
  const crossSell: CrossSellItem[] = catalog.products
    .filter((p) => !inCart.has(p.id))
    .slice(0, 4)
    .map((p) => {
      const v = p.product_variants?.[0];
      return {
        productId: p.id, slug: p.slug, name: p.name, variantId: v?.id ?? null,
        price_minor: Math.min(...p.product_variants.map((x) => x.price_minor)),
        currency: v?.currency ?? "LKR", imageUrl: p.images?.[0]?.url ?? null,
      };
    });

  return {
    lines,
    totals,
    deliveryTotals,
    code,
    currency: settings.currency,
    freeShippingThreshold: settings.free_shipping_threshold_minor,
    crossSell,
  };
}

export type CartSummary = {
  lines: CartLine[];
  totals: Awaited<ReturnType<typeof getCartSummary>>["totals"];
  code: string | null;
  currency: string;
  freeShippingThreshold: number | null;
  crossSell: CrossSellItem[];
};
