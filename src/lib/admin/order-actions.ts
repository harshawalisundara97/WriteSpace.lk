"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm } from "@/lib/auth/guards";
import { assertTransition, commitsStockBeforePayment, type OrderPaymentMethod } from "@/lib/orders/state-machine";
import { getPaymentProvider } from "@/lib/payments";
import type { OrderStatus } from "@/lib/types";
import { awardOrderPoints, reverseOrderPoints } from "@/lib/loyalty/service";
import { trackingSchema, type TrackingInput } from "@/lib/validation/admin";

export async function transitionOrder(orderId: string, to: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders").select("status,order_number,email,total_minor,currency,tracking_number,payment_method")
    .eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  const method = (["cod", "invoice"].includes(order.payment_method) ? order.payment_method : "online") as OrderPaymentMethod;
  const cod = method === "cod";
  try {
    assertTransition(order.status as OrderStatus, to, method);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid transition" };
  }
  await db.from("orders").update({ status: to }).eq("id", orderId);
  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.transition", entity: "orders", entity_id: orderId,
    before: { status: order.status }, after: { status: to },
  });

  // Cash on delivery: cash collected on delivery; stock was committed at
  // checkout, so a cancelled / refused COD order goes back on the shelf.
  if (cod && to === "delivered") {
    await db.from("payments").update({ status: "succeeded" }).eq("order_id", orderId);
    await db.from("audit_logs").insert({
      actor: ctx.userId, action: "order.cod_collected", entity: "orders", entity_id: orderId,
      after: { payment_status: "succeeded", amount_minor: order.total_minor },
    });
  }
  if (commitsStockBeforePayment(method) && to === "cancelled") {
    const { data: items } = await db.from("order_items").select("variant_id,quantity").eq("order_id", orderId);
    const restock = (items ?? []).filter((i) => i.variant_id).map((i) => ({ variant_id: i.variant_id, quantity: i.quantity }));
    if (restock.length) await db.rpc("restock", { items: restock, who: ctx.userId });
    await db.from("payments").update({ status: "failed" }).eq("order_id", orderId);
  }

  // Loyalty: credit points once the goods are in the customer's hands.
  if (to === "delivered") await awardOrderPoints(db, orderId, ctx.userId);

  // Notify the customer when the order ships.
  if (to === "shipped" && order.email) {
    const { sendOrderShipped } = await import("@/lib/email/order");
    await sendOrderShipped({
      to: order.email, orderNumber: order.order_number,
      totalMinor: order.total_minor, currency: order.currency,
      trackingNumber: order.tracking_number,
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

// Courier + tracking number/link shown to the customer on /track (TASK-NEXT-003).
export async function setTracking(orderId: string, input: TrackingInput): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = trackingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tracking details" };
  const after = {
    tracking_number: parsed.data.tracking_number || null,
    courier: parsed.data.courier || null,
    tracking_url: parsed.data.tracking_url || null,
  };
  const db = createAdminClient();
  const { error } = await db.from("orders").update(after).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.tracking", entity: "orders", entity_id: orderId, after,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export interface RefundInputForm {
  orderId: string;
  amountMinor: number;
  reason: string;
  restock: boolean;
}

export async function createRefund(input: RefundInputForm): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("refunds:create");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const db = createAdminClient();

  const { data: order } = await db
    .from("orders").select("id,status,total_minor,currency,order_number,email").eq("id", input.orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  if (input.amountMinor <= 0 || input.amountMinor > order.total_minor) {
    return { ok: false, error: "Refund amount is out of range" };
  }

  const { data: payment } = await db
    .from("payments").select("id,provider_payment_id,provider").eq("order_id", input.orderId).maybeSingle();
  if (!payment?.provider_payment_id) return { ok: false, error: "No captured payment to refund" };

  const idempotencyKey = crypto.randomUUID();

  // Record pending refund first (idempotency anchor), then call the gateway.
  const { data: refundRow } = await db.from("refunds").insert({
    payment_id: payment.id, order_id: order.id, amount_minor: input.amountMinor,
    reason: input.reason || null, status: "pending", restocked: false,
    idempotency_key: idempotencyKey, created_by: ctx.userId,
  }).select("id").single();

  let providerRefundId: string | null = null;
  try {
    const res = await getPaymentProvider().refund({
      providerPaymentId: payment.provider_payment_id,
      amountMinor: input.amountMinor,
      idempotencyKey,
    });
    providerRefundId = res.providerRefundId;
    await db.from("refunds").update({ provider_refund_id: res.providerRefundId, status: res.status }).eq("id", refundRow!.id);
  } catch (e) {
    await db.from("refunds").update({ status: "failed" }).eq("id", refundRow!.id);
    return { ok: false, error: e instanceof Error ? e.message : "Refund failed at gateway" };
  }

  // Optional restock.
  if (input.restock) {
    const { data: items } = await db.from("order_items").select("variant_id,quantity").eq("order_id", order.id);
    const list = (items ?? []).filter((i) => i.variant_id).map((i) => ({ variant_id: i.variant_id, quantity: i.quantity }));
    if (list.length) await db.rpc("restock", { items: list, who: ctx.userId });
    await db.from("refunds").update({ restocked: true }).eq("id", refundRow!.id);
  }

  // Update order status: full vs partial.
  const isFull = input.amountMinor >= order.total_minor;
  await db.from("orders").update({ status: isFull ? "refunded" : "partially_refunded" }).eq("id", order.id);
  await db.from("payments").update({ status: isFull ? "refunded" : "partially_refunded" }).eq("id", payment.id);

  await reverseOrderPoints(db, order.id, ctx.userId);

  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.refund", entity: "orders", entity_id: order.id,
    after: { amount_minor: input.amountMinor, restock: input.restock, provider_refund_id: providerRefundId, full: isFull },
  });

  // Notify the customer of the refund.
  if (order.email) {
    const { sendOrderRefunded } = await import("@/lib/email/order");
    await sendOrderRefunded({
      to: order.email, orderNumber: order.order_number,
      totalMinor: order.total_minor, currency: order.currency, refundMinor: input.amountMinor,
    });
  }

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const db = createAdminClient();
  const { error } = await db.from("orders").update({ notes: notes || null }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "order.note", entity: "orders", entity_id: orderId, after: { notes } });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/** Invoice orders (B2B): record that the bank transfer arrived. Independent of fulfilment status. */
export async function markInvoicePaid(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("status,payment_method,total_minor").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  if (order.payment_method !== "invoice") return { ok: false, error: "Not an invoice order" };
  if (order.status === "cancelled") return { ok: false, error: "Order is cancelled" };
  const { data: pay } = await db.from("payments").select("id,status").eq("order_id", orderId).maybeSingle();
  if (pay?.status === "succeeded") return { ok: false, error: "Already marked paid" };
  await db.from("payments").update({ status: "succeeded" }).eq("order_id", orderId);
  if (order.status === "pending_payment") await db.from("orders").update({ status: "paid" }).eq("id", orderId);
  await db.from("audit_logs").insert({
    actor: perm.ctx.userId, action: "order.invoice_paid", entity: "orders", entity_id: orderId,
    after: { payment_status: "succeeded", amount_minor: order.total_minor },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}
