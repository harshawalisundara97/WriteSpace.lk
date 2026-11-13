// Delivery methods — the single source of truth for ids, labels, copy and fees.
// Shared by computeTotals (server-trusted fee), the checkout selector and the
// order displays. Integer minor units.

export type DeliveryMethodId = "standard" | "express" | "pickup";

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  /** Shown under the label in the checkout selector. */
  description: string;
  /** False = collected in store, so no delivery address is needed. */
  needsAddress: boolean;
}

/** Express = the store's flat shipping fee plus this surcharge (LKR 400.00). */
export const EXPRESS_SURCHARGE_MINOR = 40000;

export const DEFAULT_DELIVERY_METHOD: DeliveryMethodId = "standard";

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "standard", label: "Standard delivery", description: "Delivered in 2–4 working days", needsAddress: true },
  { id: "express", label: "Express delivery", description: "Delivered in 1–2 working days", needsAddress: true },
  { id: "pickup", label: "Store pickup", description: "Collect from our store — we'll email you when it's ready", needsAddress: false },
];

export const DELIVERY_METHOD_IDS = DELIVERY_METHODS.map((m) => m.id) as [DeliveryMethodId, ...DeliveryMethodId[]];

/** Method for an id; unknown / missing (pre-TASK-009 orders) falls back to standard. */
export function deliveryMethod(id: unknown): DeliveryMethod {
  return DELIVERY_METHODS.find((m) => m.id === id) ?? DELIVERY_METHODS[0];
}

/**
 * Fee for a method.
 * - standard: flat fee, waived when `standardFree` (threshold met or a free-shipping promo).
 * - express: flat fee + surcharge, never waived (a paid upgrade).
 * - pickup: always free.
 */
export function deliveryFee(
  id: DeliveryMethodId,
  opts: { flat_shipping_minor: number; standardFree: boolean },
): number {
  if (id === "pickup") return 0;
  if (id === "express") return opts.flat_shipping_minor + EXPRESS_SURCHARGE_MINOR;
  return opts.standardFree ? 0 : opts.flat_shipping_minor;
}
