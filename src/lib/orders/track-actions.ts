"use server";

// Guest order lookup for /track (TASK-NEXT-003). Uses the service-role client
// server-side and returns only a minimal, non-sensitive view of the order —
// never the address, items' prices or payment details. A miss and a contact
// mismatch return the same message so order numbers can't be probed.
import { z } from "zod";
import { hasSupabase } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoOrders } from "@/lib/demo/data";
import type { OrderStatus } from "@/lib/types";
import {
  buildTimeline, contactMatches, courierName, normalizeOrderNumber, safeTrackingUrl,
  type StatusEvent, type TrackingTimeline,
} from "@/lib/orders/tracking";

const schema = z.object({
  orderNumber: z.string().trim().min(4, "Enter your order number").max(40),
  contact: z.string().trim().min(5, "Enter the email or phone used at checkout").max(120),
});

export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: "online" | "cod";
  placedAt: string;
  itemCount: number;
  timeline: TrackingTimeline;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export type TrackResult = { ok: true; order: TrackedOrder } | { ok: false; error: string };

const NOT_FOUND = "We couldn't find an order with those details. Check the order number and the email or phone you used at checkout.";

interface Row {
  id: string; order_number: string; email: string; status: string; created_at: string;
  payment_method?: string | null; shipping_address: Record<string, string> | null;
  tracking_number: string | null; courier?: string | null; tracking_url?: string | null;
}

function toTracked(o: Row, events: StatusEvent[], itemCount: number): TrackedOrder {
  const paymentMethod = o.payment_method === "cod" ? "cod" : "online";
  const status = o.status as OrderStatus;
  return {
    orderNumber: o.order_number, status, paymentMethod, placedAt: o.created_at, itemCount,
    timeline: buildTimeline({ status, paymentMethod, createdAt: o.created_at, events }),
    courier: courierName(o.courier),
    trackingNumber: o.tracking_number,
    trackingUrl: safeTrackingUrl(o.tracking_url),
  };
}

function eventsFrom(rows: { after: unknown; created_at: string }[]): StatusEvent[] {
  return rows.flatMap((r) => {
    const s = (r.after as { status?: unknown } | null)?.status;
    return typeof s === "string" ? [{ status: s, at: r.created_at }] : [];
  });
}

export async function trackOrder(input: { orderNumber: string; contact: string }): Promise<TrackResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const orderNumber = normalizeOrderNumber(parsed.data.orderNumber);
  const contact = parsed.data.contact;

  if (!hasSupabase()) {
    const o = demoOrders.find((x) => x.order_number === orderNumber);
    if (!o || !contactMatches(contact, { email: o.email, phone: o.shipping_address?.phone })) return { ok: false, error: NOT_FOUND };
    return { ok: true, order: toTracked(o, eventsFrom(o.activity), o.items.reduce((n, i) => n + i.quantity, 0)) };
  }

  const db = createAdminClient();
  const { data: o } = await db
    .from("orders")
    .select("id,order_number,email,status,created_at,payment_method,shipping_address,tracking_number,courier,tracking_url")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!o || !contactMatches(contact, { email: o.email, phone: (o.shipping_address as Record<string, string> | null)?.phone })) {
    return { ok: false, error: NOT_FOUND };
  }
  const [{ data: logs }, { data: items }] = await Promise.all([
    db.from("audit_logs").select("after,created_at").eq("entity", "orders").eq("entity_id", o.id).order("created_at", { ascending: true }),
    db.from("order_items").select("quantity").eq("order_id", o.id),
  ]);
  const itemCount = (items ?? []).reduce((n, i) => n + (i.quantity as number), 0);
  return { ok: true, order: toTracked(o as Row, eventsFrom(logs ?? []), itemCount) };
}
