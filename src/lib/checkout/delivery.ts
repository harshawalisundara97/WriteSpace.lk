// Delivery methods — the single source of truth for ids, labels, copy and fees.
// Shared by computeTotals (server-trusted fee), the checkout selector and the
// order displays. Integer minor units.
//
// Labels / address rules are fixed in code; fees, availability and the
// checkout copy are admin-editable store settings (TASK-ADMIN-005).

export type DeliveryMethodId = "standard" | "express" | "pickup";

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  /** Shown under the label in the checkout selector. */
  description: string;
  /** False = collected in store, so no delivery address is needed. */
  needsAddress: boolean;
}

/** Default express surcharge on top of the flat fee (LKR 400.00). */
export const EXPRESS_SURCHARGE_MINOR = 40000;

export const DEFAULT_DELIVERY_METHOD: DeliveryMethodId = "standard";

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "standard", label: "Standard delivery", description: "Delivered in 2–4 working days", needsAddress: true },
  { id: "express", label: "Express delivery", description: "Delivered in 1–2 working days", needsAddress: true },
  { id: "pickup", label: "Store pickup", description: "Collect from our store — we'll email you when it's ready", needsAddress: false },
];

export const DELIVERY_METHOD_IDS = DELIVERY_METHODS.map((m) => m.id) as [DeliveryMethodId, ...DeliveryMethodId[]];

/** Admin-editable delivery settings (store_settings columns). */
export interface DeliverySettings {
  express_surcharge_minor: number;
  express_enabled: boolean;
  pickup_enabled: boolean;
  standard_description: string | null;
  express_description: string | null;
  pickup_description: string | null;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  express_surcharge_minor: EXPRESS_SURCHARGE_MINOR,
  express_enabled: true,
  pickup_enabled: true,
  standard_description: null,
  express_description: null,
  pickup_description: null,
};

/** Normalise a raw store_settings row (missing columns → defaults). */
export function toDeliverySettings(row: Partial<Record<keyof DeliverySettings, unknown>> | null | undefined): DeliverySettings {
  const d = DEFAULT_DELIVERY_SETTINGS;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const surcharge = Number(row?.express_surcharge_minor);
  return {
    express_surcharge_minor: Number.isInteger(surcharge) && surcharge >= 0 ? surcharge : d.express_surcharge_minor,
    express_enabled: typeof row?.express_enabled === "boolean" ? row.express_enabled : d.express_enabled,
    pickup_enabled: typeof row?.pickup_enabled === "boolean" ? row.pickup_enabled : d.pickup_enabled,
    standard_description: text(row?.standard_description),
    express_description: text(row?.express_description),
    pickup_description: text(row?.pickup_description),
  };
}

/** Method for an id; unknown / missing (pre-TASK-009 orders) falls back to standard. */
export function deliveryMethod(id: unknown): DeliveryMethod {
  return DELIVERY_METHODS.find((m) => m.id === id) ?? DELIVERY_METHODS[0];
}

/** Whether a method is currently offered. Standard is always on. */
export function isDeliveryMethodEnabled(id: DeliveryMethodId, s: DeliverySettings): boolean {
  if (id === "express") return s.express_enabled;
  if (id === "pickup") return s.pickup_enabled;
  return true;
}

/** Methods offered at checkout, with admin copy applied over the defaults. */
export function availableDeliveryMethods(s: DeliverySettings): DeliveryMethod[] {
  return DELIVERY_METHODS.filter((m) => isDeliveryMethodEnabled(m.id, s)).map((m) => ({
    ...m,
    description: s[`${m.id}_description`] ?? m.description,
  }));
}

/**
 * Fee for a method.
 * - standard: flat fee, waived when `standardFree` (threshold met or a free-shipping promo).
 * - express: flat fee + surcharge, never waived (a paid upgrade).
 * - pickup: always free.
 */
export function deliveryFee(
  id: DeliveryMethodId,
  opts: { flat_shipping_minor: number; standardFree: boolean; express_surcharge_minor?: number },
): number {
  if (id === "pickup") return 0;
  if (id === "express") return opts.flat_shipping_minor + (opts.express_surcharge_minor ?? EXPRESS_SURCHARGE_MINOR);
  return opts.standardFree ? 0 : opts.flat_shipping_minor;
}
