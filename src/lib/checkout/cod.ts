// Cash on Delivery — TASK-NEXT-002. Pure rules shared by checkout (server-trusted),
// the checkout UI and admin settings. Integer minor units.
//
// - Admin toggles COD, sets a flat fee, a max order value and allowed districts.
// - Store pickup + COD = pay at the counter: district rules don't apply.
// - The max order value is checked against the order total *before* the COD fee.

import type { DeliveryMethodId } from "@/lib/checkout/delivery";

export type PaymentMethodId = "online" | "cod";
export const PAYMENT_METHOD_IDS = ["online", "cod"] as const;

/** The 25 administrative districts of Sri Lanka. */
export const SL_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
] as const;
export type District = (typeof SL_DISTRICTS)[number];

export function isDistrict(v: unknown): v is District {
  return typeof v === "string" && (SL_DISTRICTS as readonly string[]).includes(v);
}

export interface CodSettings {
  cod_enabled: boolean;
  /** Flat fee added to COD orders (LKR 150.00 default). */
  cod_fee_minor: number;
  /** Max order total (before fee) allowed for COD; null = no limit. */
  cod_max_order_minor: number | null;
  cod_districts: District[];
}

export const DEFAULT_COD_SETTINGS: CodSettings = {
  cod_enabled: false,
  cod_fee_minor: 15000,
  cod_max_order_minor: 2500000,
  cod_districts: [...SL_DISTRICTS],
};

/** Normalise a raw store_settings row (missing / bad columns → defaults). */
export function toCodSettings(row: Partial<Record<keyof CodSettings, unknown>> | null | undefined): CodSettings {
  const d = DEFAULT_COD_SETTINGS;
  const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
  let max = d.cod_max_order_minor;
  if (row && "cod_max_order_minor" in row) max = row.cod_max_order_minor === null ? null : int(row.cod_max_order_minor) ?? d.cod_max_order_minor;
  return {
    cod_enabled: typeof row?.cod_enabled === "boolean" ? row.cod_enabled : d.cod_enabled,
    cod_fee_minor: int(row?.cod_fee_minor) ?? d.cod_fee_minor,
    cod_max_order_minor: max,
    cod_districts: Array.isArray(row?.cod_districts) ? row.cod_districts.filter(isDistrict) : [...d.cod_districts],
  };
}

export type CodCheck = { ok: true } | { ok: false; reason: string };

/** Whether COD can be used for this order. `orderTotalMinor` excludes the COD fee. */
export function codEligibility(
  s: CodSettings,
  o: { orderTotalMinor: number; deliveryMethod: DeliveryMethodId; district?: string | null },
): CodCheck {
  if (!s.cod_enabled) return { ok: false, reason: "Cash on delivery is not available right now" };
  if (s.cod_max_order_minor != null && o.orderTotalMinor > s.cod_max_order_minor) {
    return { ok: false, reason: "This order is above the cash on delivery limit" };
  }
  if (o.deliveryMethod === "pickup") return { ok: true };
  if (!isDistrict(o.district)) return { ok: false, reason: "Choose your district" };
  if (!s.cod_districts.includes(o.district)) {
    return { ok: false, reason: `Cash on delivery is not available in ${o.district}` };
  }
  return { ok: true };
}

/** Fee for a payment method (0 for online). */
export function paymentFee(method: PaymentMethodId, s: CodSettings): number {
  return method === "cod" ? s.cod_fee_minor : 0;
}
