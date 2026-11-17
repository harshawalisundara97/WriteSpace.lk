"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCartLines, getPromoCode } from "@/lib/cart/actions";
import { getActivePromotions, getStoreSettings } from "@/lib/catalog/queries";
import { computeTotals } from "@/lib/pricing/cart-total";
import { getPaymentProvider } from "@/lib/payments";
import { orderNumber } from "@/lib/orders/number";
import { checkoutSchema } from "@/lib/validation/checkout";
import { codEligibility, paymentFee, toCodSettings } from "@/lib/checkout/cod";
import { resolveGift, toGiftSettings } from "@/lib/checkout/gift";
import { resolveRedemption, toLoyaltySettings } from "@/lib/loyalty/rules";
import { customerBalance, debitRedeemedPoints } from "@/lib/loyalty/service";
import { deliveryMethod, isDeliveryMethodEnabled, toDeliverySettings } from "@/lib/checkout/delivery";

const HOLD_MINUTES = 15;


export interface CheckoutResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  redirectFields?: Record<string, string>;
  provider?: string;
}

export async function createCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address" };
  }
  const { delivery_method, payment_method, district, gift_wrap, gift_message, loyalty_points, ...contact } = parsed.data;
  // Store pickup carries no delivery address — keep contact details only.
  const address = deliveryMethod(delivery_method).needsAddress
    ? { ...contact, district: district || "" }
    : { ...contact, district: "", line1: "", line2: "", city: "", postal_code: "" };

  const db = createAdminClient();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  // Recompute everything server-side — never trust client prices.
  const [lines, code, promotions, settings] = await Promise.all([
    getCartLines(), getPromoCode(), getActivePromotions(), getStoreSettings(),
  ]);
  if (lines.length === 0) return { ok: false, error: "Your cart is empty" };
  if (!isDeliveryMethodEnabled(delivery_method, toDeliverySettings(settings))) {
    return { ok: false, error: `${deliveryMethod(delivery_method).label} is not available right now` };
  }

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
      express_surcharge_minor: settings.express_surcharge_minor,
      delivery_method,
    },
    code,
  );

  // Cash on delivery: re-check admin rules server-side and add the fee.
  const cod = payment_method === "cod";
  const codSettings = toCodSettings(settings);
  if (cod) {
    const check = codEligibility(codSettings, { orderTotalMinor: totals.total_minor, deliveryMethod: delivery_method, district });
    if (!check.ok) return { ok: false, error: check.reason };
  }
  const codFee = paymentFee(payment_method, codSettings);
  const gift = resolveGift(toGiftSettings(settings), { gift_wrap, gift_message });
  if (!gift.ok) return { ok: false, error: gift.reason };
  // Loyalty points (signed-in only): capped on merchandise after promo discounts.
  if (loyalty_points > 0 && !userId) return { ok: false, error: "Sign in to use loyalty points" };
  const redeem = resolveRedemption(toLoyaltySettings(settings), {
    points: loyalty_points,
    balance: loyalty_points > 0 && userId ? await customerBalance(db, userId) : 0,
    subtotalMinor: totals.subtotal_minor - totals.discount_minor,
  });
  if (!redeem.ok) return { ok: false, error: redeem.reason };
  const totalMinor = totals.total_minor - redeem.discount_minor + codFee + gift.fee_minor;

  const items = lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity }));

  // Reserve stock atomically (throws P0001 if short).
  const { error: reserveErr } = await db.rpc("reserve_stock", { items, hold_minutes: HOLD_MINUTES });
  if (reserveErr) return { ok: false, error: "Some items just went out of stock. Please review your cart." };

  const idempotencyKey = crypto.randomUUID();
  // COD has no payment window: the order is placed now, so no hold expiry.
  const reservedUntil = cod ? null : new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

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
      total_minor: totalMinor,
      payment_method,
      cod_fee_minor: codFee,
      gift_wrap: gift.gift_wrap,
      gift_wrap_minor: gift.fee_minor,
      gift_message: gift.gift_message,
      loyalty_points_redeemed: redeem.points,
      loyalty_discount_minor: redeem.discount_minor,
      ...(cod ? { placed_at: new Date().toISOString() } : {}),
      shipping_address: address,
      delivery_method,
      idempotency_key: idempotencyKey,
      reserved_until: reservedUntil,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    await db.rpc("release_stock", { items });
    return { ok: false, error: "Could not create order. Please try again." };
  }

  // Debit points now; the cancel trigger (0021) credits them back if the order dies.
  if (redeem.points > 0 && userId) {
    const debited = await debitRedeemedPoints(db, { customerId: userId, orderId: order.id, points: redeem.points, discountMinor: redeem.discount_minor });
    if (!debited) {
      await db.rpc("release_stock", { items });
      await db.from("orders").update({ status: "cancelled", reserved_until: null, loyalty_points_redeemed: 0 }).eq("id", order.id);
      return { ok: false, error: "Could not apply your points. Please try again." };
    }
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

  if (cod) {
    return placeCodOrder(db, {
      orderId: order.id, orderNumber: order.order_number, email: address.email, totalMinor, currency: settings.currency, items,
      emailItems: lines.map((l) => ({ name: l.product_name, quantity: l.quantity, lineTotalMinor: l.unit_price_minor * l.quantity })),
    });
  }

  // Payment row + provider intent.
  const { data: payment } = await db
    .from("payments")
    .insert({
      order_id: order.id,
      provider: getPaymentProvider().name,
      status: "requires_payment",
      amount_minor: totalMinor,
      currency: settings.currency,
    })
    .select("id")
    .single();

  try {
    const intent = await getPaymentProvider().createIntent({
      orderId: order.id,
      amountMinor: totalMinor,
      currency: settings.currency,
      email: address.email,
      idempotencyKey,
      orderNumber: order.order_number,
      customer: {
        fullName: address.full_name,
        phone: address.phone,
        address: [address.line1, address.line2].filter(Boolean).join(", "),
        city: address.city ?? "",
        country: "Sri Lanka",
      },
    });
    if (payment) {
      await db.from("payments").update({ provider_payment_id: intent.providerPaymentId }).eq("id", payment.id);
    }
    return {
      ok: true,
      orderId: order.id,
      clientSecret: intent.clientSecret,
      redirectUrl: intent.redirectUrl,
      redirectFields: intent.redirectFields,
      provider: intent.provider,
    };
  } catch (e) {
    // Roll back the hold so stock isn't stranded if the gateway call fails.
    await db.rpc("release_stock", { items });
    await db.from("orders").update({ status: "cancelled", reserved_until: null }).eq("id", order.id);
    const msg = e instanceof Error ? e.message : "Payment setup failed";
    return { ok: false, error: msg };
  }
}

type AdminDb = ReturnType<typeof createAdminClient>;

/**
 * Cash on delivery: commit the reserved stock now (the order is placed), record
 * an unpaid "cod" payment, audit and email. The order stays pending_payment
 * (awaiting payment) until it is marked delivered.
 */
async function placeCodOrder(
  db: AdminDb,
  o: { orderId: string; orderNumber: string; email: string; totalMinor: number; currency: string;
    items: { variant_id: string; quantity: number }[]; emailItems: { name: string; quantity: number; lineTotalMinor: number }[] },
): Promise<CheckoutResult> {
  const { error: commitErr } = await db.rpc("commit_stock", { items: o.items });
  if (commitErr) {
    await db.rpc("release_stock", { items: o.items });
    await db.from("orders").update({ status: "cancelled", reserved_until: null }).eq("id", o.orderId);
    return { ok: false, error: "Could not place order. Please try again." };
  }
  await db.from("payments").insert({
    order_id: o.orderId, provider: "cod", status: "requires_payment", amount_minor: o.totalMinor, currency: o.currency,
  });
  await db.from("audit_logs").insert({
    action: "order.placed_cod", entity: "orders", entity_id: o.orderId,
    after: { status: "pending_payment", payment_method: "cod", total_minor: o.totalMinor },
  });
  const { sendOrderConfirmation } = await import("@/lib/email/order");
  await sendOrderConfirmation({ to: o.email, orderNumber: o.orderNumber, totalMinor: o.totalMinor, currency: o.currency, items: o.emailItems }).catch(() => {});
  return { ok: true, orderId: o.orderId, provider: "cod" };
}
