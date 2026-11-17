// Abandoned-cart email — TASK-NEXT-006. Pure rules + unsubscribe tokens.
//
// - Signed-in carts only (we need a verified email + consent to contact).
// - Eligible when idle > 24h, not older than 7 days, has items, no reminder sent
//   for this idle period (cart_items changes re-arm it via a DB trigger), the
//   customer hasn't opted out and isn't blocked.
import { createHmac, timingSafeEqual } from "node:crypto";

export const IDLE_HOURS = 24;
export const MAX_IDLE_DAYS = 7;

export interface CartCandidate {
  updated_at: string;
  reminder_sent_at: string | null;
  item_count: number;
  opted_out: boolean;
  blocked: boolean;
  email: string | null;
}

export function isAbandoned(c: CartCandidate, now: Date = new Date()): boolean {
  if (c.reminder_sent_at || c.opted_out || c.blocked || !c.email || c.item_count <= 0) return false;
  const idleMs = now.getTime() - new Date(c.updated_at).getTime();
  if (!Number.isFinite(idleMs)) return false;
  return idleMs >= IDLE_HOURS * 3600_000 && idleMs <= MAX_IDLE_DAYS * 86400_000;
}

/** Window to query: carts updated between `from` and `to`. */
export function idleWindow(now: Date = new Date()): { from: string; to: string } {
  return {
    from: new Date(now.getTime() - MAX_IDLE_DAYS * 86400_000).toISOString(),
    to: new Date(now.getTime() - IDLE_HOURS * 3600_000).toISOString(),
  };
}

function key(secret: string) {
  return `cart-reminder-unsubscribe:${secret}`;
}

export function unsubscribeToken(customerId: string, secret: string): string {
  return createHmac("sha256", key(secret)).update(customerId).digest("base64url");
}

export function verifyUnsubscribeToken(customerId: string, token: string, secret: string): boolean {
  if (!secret || !customerId || !token) return false;
  const a = Buffer.from(unsubscribeToken(customerId, secret));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Secret for unsubscribe links: dedicated var, falling back to CRON_SECRET. */
export function unsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";
}
