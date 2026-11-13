"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCartLines, getPromoCode } from "@/lib/cart/actions";
import { getActivePromotions, getStoreSettings } from "@/lib/catalog/queries";
import { computeTotals } from "@/lib/pricing/cart-total";
import { getPaymentProvider } from "@/lib/payments";
import { checkoutSchema } from "@/lib/validation/checkout";
import { deliveryMethod } from "@/lib/checkout/delivery";

const HOLD_MINUTES = 15;

function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `WS-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  clientSecret?: string;
  provider?: string;
}

export async function createCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address" };
  }
  const { delivery_method, ...contact } = parsed.data;
  // Store pickup carries no delivery address — keep contact details only.
  const address = deliveryMethod(delivery_method).needsAddress
    ? contact
    : { ...contact, line1: "", line2: "", city: "", postal_code: "" };

  const db = createAdminClient();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  // Recompute everything server-side — never trust client prices.
  const [lines, code, promotions, settings] = await Promise.all([
    getCartLines(), getPromoCode(), getActivePromotions(), getStoreSettings(),
  ]);
  if (lines.length === 0) return { ok: false, error: "Your cart is empty" };

  // Stock sanity before reserving.
  for (const l of lines) {
    if (l.quantity > l.available) return { ok: false, error: `Not enough stock for ${l.product_name}` };
  }

  const totals = computeTotals(
    lines, promotions,
    {
      flat_shipping_minor: settings.flat_shipping_minor,
      free_shipping_threshold_minor: settings.free_shipping_threshold_minor,
      tax_rate_bps: settings.tax_rate_bps,
      delivery_method,
    },
    code,
  );

  const items = lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity }));

  // Reserve stock atomically (throws P0001 if short).
  const { error: reserveErr } = await db.rpc("reserve_stock", { items, hold_minutes: HOLD_MINUTES });
  if (reserveErr) return { ok: false, error: "Some items just went out of stock. Please review your cart." };

  const idempotencyKey = crypto.randomUUID();
  const reservedUntil = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

  // Create order.
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber(),
      customer_id: userId,
      email: address.email,
      status: "pending_payment",
      currency: settings.currency,
      subtotal_minor: totals.subtotal_minor,
      discount_minor: totals.discount_minor,
      shipping_minor: totals.shipping_minor,
      tax_minor: totals.tax_minor,
      total_minor: totals.total_minor,
      shipping_address: address,
      delivery_method,
      idempotency_key: idempotencyKey,
      reserved_until: reservedUntil,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    await db.rpc("release_stock", { items });
    return { ok: false, error: "Could not create order. Please try again." };
  }

  // Snapshot line items.
  await db.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      variant_id: l.variant_id,
      product_name: l.product_name,
      sku: l.sku,
      unit_price_minor: l.unit_price_minor,
      quantity: l.quantity,
      line_total_minor: l.unit_price_minor * l.quantity,
    })),
  );

  // Payment row + provider intent.
  const { data: payment } = await db
    .from("payments")
    .insert({
      order_id: order.id,
      provider: getPaymentProvider().name,
      status: "requires_payment",
      amount_minor: totals.total_minor,
      currency: settings.currency,
    })
    .select("id")
    .single();

  try {
    const intent = await getPaymentProvider().createIntent({
      orderId: order.id,
      amountMinor: totals.total_minor,
      currency: settings.currency,
      email: address.email,
      idempotencyKey,
    });
    if (payment) {
      await db.from("payments").update({ provider_payment_id: intent.providerPaymentId }).eq("id", payment.id);
    }
    return { ok: true, orderId: order.id, clientSecret: intent.clientSecret, provider: intent.provider };
  } catch (e) {
    // Roll back the hold so stock isn't stranded if the gateway call fails.
    await db.rpc("release_stock", { items });
    await db.from("orders").update({ status: "cancelled", reserved_until: null }).eq("id", order.id);
    const msg = e instanceof Error ? e.message : "Payment setup failed";
    return { ok: false, error: msg };
  }
}
