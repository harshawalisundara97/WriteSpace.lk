"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";
import { assertTransition } from "@/lib/orders/state-machine";
import { getPaymentProvider } from "@/lib/payments";
import type { OrderStatus } from "@/lib/types";

export async function transitionOrder(orderId: string, to: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("orders:write");
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  try {
    assertTransition(order.status as OrderStatus, to);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid transition" };
  }
  await db.from("orders").update({ status: to }).eq("id", orderId);
  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.transition", entity: "orders", entity_id: orderId,
    before: { status: order.status }, after: { status: to },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function setTracking(orderId: string, tracking: string): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("orders:write");
  const db = createAdminClient();
  await db.from("orders").update({ tracking_number: tracking || null }).eq("id", orderId);
  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.tracking", entity: "orders", entity_id: orderId, after: { tracking_number: tracking },
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
  const ctx = await requirePerm("refunds:create");
  const db = createAdminClient();

  const { data: order } = await db
    .from("orders").select("id,status,total_minor,currency").eq("id", input.orderId).maybeSingle();
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

  await db.from("audit_logs").insert({
    actor: ctx.userId, action: "order.refund", entity: "orders", entity_id: order.id,
    after: { amount_minor: input.amountMinor, restock: input.restock, provider_refund_id: providerRefundId, full: isFull },
  });

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}
