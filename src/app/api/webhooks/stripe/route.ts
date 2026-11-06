import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation } from "@/lib/email/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function itemsForOrder(db: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data } = await db
    .from("order_items")
    .select("variant_id,quantity,product_name,line_total_minor")
    .eq("order_id", orderId);
  return data ?? [];
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();

  // Idempotency: record the event id; if it already exists, we've processed it.
  const { error: dupeErr } = await db.from("webhook_events").insert({ id: event.id, provider: "stripe" });
  if (dupeErr) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (orderId) await markPaid(db, orderId, pi.id);
    } else if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (orderId) await markFailed(db, orderId);
    }
  } catch (e) {
    console.error("[webhook] handler error", e);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markPaid(db: ReturnType<typeof createAdminClient>, orderId: string, piId: string) {
  const { data: order } = await db
    .from("orders")
    .select("id,status,order_number,email,total_minor,currency")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "pending_payment") return; // already handled or gone

  const items = await itemsForOrder(db, orderId);

  // Decrement stock from the reservation.
  await db.rpc("commit_stock", {
    items: items.filter((i) => i.variant_id).map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
  });

  await db.from("orders").update({ status: "paid", reserved_until: null, placed_at: new Date().toISOString() }).eq("id", orderId);
  await db.from("payments").update({ status: "succeeded", provider_payment_id: piId }).eq("order_id", orderId);

  await db.from("audit_logs").insert({
    action: "order.paid", entity: "orders", entity_id: orderId,
    after: { status: "paid", payment_intent: piId },
  });

  await sendOrderConfirmation({
    to: order.email,
    orderNumber: order.order_number,
    totalMinor: order.total_minor,
    currency: order.currency,
    items: items.map((i) => ({ name: i.product_name, quantity: i.quantity, lineTotalMinor: i.line_total_minor })),
  });
}

async function markFailed(db: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data: order } = await db.from("orders").select("id,status").eq("id", orderId).maybeSingle();
  if (!order || order.status !== "pending_payment") return;
  const items = await itemsForOrder(db, orderId);
  await db.rpc("release_stock", {
    items: items.filter((i) => i.variant_id).map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
  });
  await db.from("orders").update({ status: "cancelled", reserved_until: null }).eq("id", orderId);
  await db.from("payments").update({ status: "failed" }).eq("order_id", orderId);
}
