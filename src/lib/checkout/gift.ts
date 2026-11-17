// Gift wrap & message — TASK-NEXT-007. Pure rules shared by checkout
// (server-trusted), the checkout UI and admin settings. Integer minor units.
//
// - Admin toggles gift wrap and sets a flat fee per order.
// - The gift message (optional, only with gift wrap) is printed on the packing slip.

export const GIFT_MESSAGE_MAX = 200;

export interface GiftSettings {
  gift_wrap_enabled: boolean;
  /** Flat gift-wrap fee per order (LKR 250.00 default). */
  gift_wrap_fee_minor: number;
}

export const DEFAULT_GIFT_SETTINGS: GiftSettings = {
  gift_wrap_enabled: false,
  gift_wrap_fee_minor: 25000,
};

/** Normalise a raw store_settings row (missing / bad columns → defaults). */
export function toGiftSettings(row: Partial<Record<keyof GiftSettings, unknown>> | null | undefined): GiftSettings {
  const d = DEFAULT_GIFT_SETTINGS;
  const fee = row?.gift_wrap_fee_minor;
  return {
    gift_wrap_enabled: typeof row?.gift_wrap_enabled === "boolean" ? row.gift_wrap_enabled : d.gift_wrap_enabled,
    gift_wrap_fee_minor: typeof fee === "number" && Number.isInteger(fee) && fee >= 0 ? fee : d.gift_wrap_fee_minor,
  };
}

/** Trim lines, collapse runs of blank lines, cap length; empty → null. */
export function normaliseGiftMessage(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n").map((l) => l.trimEnd()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, GIFT_MESSAGE_MAX)
    .trim();
  return s.length ? s : null;
}

export type GiftCheck =
  | { ok: true; gift_wrap: boolean; gift_message: string | null; fee_minor: number }
  | { ok: false; reason: string };

/** Resolve the customer's gift choice against admin settings. A message without wrap is dropped. */
export function resolveGift(s: GiftSettings, input: { gift_wrap?: boolean; gift_message?: string | null }): GiftCheck {
  if (!input.gift_wrap) return { ok: true, gift_wrap: false, gift_message: null, fee_minor: 0 };
  if (!s.gift_wrap_enabled) return { ok: false, reason: "Gift wrapping is not available right now" };
  return { ok: true, gift_wrap: true, gift_message: normaliseGiftMessage(input.gift_message), fee_minor: s.gift_wrap_fee_minor };
}
