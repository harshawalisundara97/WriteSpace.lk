import "server-only";
// Loyalty ledger writes — TASK-NEXT-008b. Service-role client only; callers audit.
// Loyalty must never block order flow: every function swallows its own errors.
import { toLoyaltySettings, pointsEarned, expiryFor, pointsToReverse, balanceAt, type LedgerEntry } from "./rules";

// Structural type so callers can pass the real admin client (or a test fake).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

export type LoyaltyResult = { points: number } | null;

/** Credit points for a delivered order. Idempotent (one 'earn' row per order). */
export async function awardOrderPoints(db: Db, orderId: string, actor: string | null, now = new Date()): Promise<LoyaltyResult> {
  try {
    const [{ data: settings }, { data: order }, { data: existing }] = await Promise.all([
      db.from("store_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("orders").select("customer_id,subtotal_minor,discount_minor,loyalty_discount_minor").eq("id", orderId).maybeSingle(),
      db.from("loyalty_ledger").select("id").eq("order_id", orderId).eq("kind", "earn").maybeSingle(),
    ]);
    if (!order?.customer_id || existing) return null;
    const s = toLoyaltySettings(settings);
    const merch = (order.subtotal_minor ?? 0) - (order.discount_minor ?? 0) - (order.loyalty_discount_minor ?? 0);
    const points = pointsEarned(s, merch);
    if (points <= 0) return null;
    const { error } = await db.from("loyalty_ledger").insert({
      customer_id: order.customer_id, order_id: orderId, kind: "earn", points,
      expires_at: expiryFor(s, now)?.toISOString() ?? null, actor_id: actor,
    });
    if (error) return null; // unique index lost a race → already awarded
    await db.from("audit_logs").insert({
      actor, action: "loyalty.earn", entity: "orders", entity_id: orderId, after: { points, customer_id: order.customer_id },
    });
    return { points };
  } catch {
    return null;
  }
}

/** Debit earned points in proportion to the order's total refunded amount. */
export async function reverseOrderPoints(db: Db, orderId: string, actor: string | null): Promise<LoyaltyResult> {
  try {
    const [{ data: order }, { data: rows }, { data: refunds }] = await Promise.all([
      db.from("orders").select("customer_id,total_minor").eq("id", orderId).maybeSingle(),
      db.from("loyalty_ledger").select("kind,points").eq("order_id", orderId),
      db.from("refunds").select("amount_minor,status").eq("order_id", orderId),
    ]);
    if (!order?.customer_id) return null;
    const list = (rows ?? []) as { kind: string; points: number }[];
    const earned = list.filter((r) => r.kind === "earn").reduce((a, r) => a + r.points, 0);
    const reversed = -list.filter((r) => r.kind === "reverse").reduce((a, r) => a + r.points, 0);
    const refunded = ((refunds ?? []) as { amount_minor: number; status: string }[])
      .filter((r) => r.status !== "failed").reduce((a, r) => a + r.amount_minor, 0);
    const points = pointsToReverse(earned, reversed, refunded, order.total_minor ?? 0);
    if (points <= 0) return null;
    await db.from("loyalty_ledger").insert({
      customer_id: order.customer_id, order_id: orderId, kind: "reverse", points: -points, actor_id: actor,
    });
    await db.from("audit_logs").insert({
      actor, action: "loyalty.reverse", entity: "orders", entity_id: orderId, after: { points: -points, customer_id: order.customer_id },
    });
    return { points };
  } catch {
    return null;
  }
}

/** Spendable balance for a customer at `now` (service-role read). */
export async function customerBalance(db: Db, customerId: string, now = new Date()): Promise<number> {
  const { data } = await db.from("loyalty_ledger").select("points,created_at,expires_at").eq("customer_id", customerId);
  return balanceAt((data ?? []) as LedgerEntry[], now);
}

/** Debit redeemed points against a freshly created order and audit it. */
export async function debitRedeemedPoints(db: Db, o: { customerId: string; orderId: string; points: number; discountMinor: number }): Promise<boolean> {
  const { error } = await db.from("loyalty_ledger").insert({
    customer_id: o.customerId, order_id: o.orderId, kind: "redeem", points: -o.points, actor_id: o.customerId,
  });
  if (error) return false;
  await db.from("audit_logs").insert({
    actor: o.customerId, action: "loyalty.redeem", entity: "orders", entity_id: o.orderId,
    after: { points: -o.points, discount_minor: o.discountMinor },
  });
  return true;
}
