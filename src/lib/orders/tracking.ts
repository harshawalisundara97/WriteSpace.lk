// Guest order tracking (TASK-NEXT-003). Pure helpers — no I/O — so the /track
// lookup, admin courier form and tests share one set of rules.
import type { OrderStatus } from "@/lib/types";

export const COURIERS = [
  { id: "domex", name: "Domex" },
  { id: "pronto", name: "Pronto" },
  { id: "koombiyo", name: "Koombiyo" },
  { id: "slpost", name: "Sri Lanka Post" },
  { id: "other", name: "Other" },
] as const;
export type CourierId = (typeof COURIERS)[number]["id"];
export const COURIER_IDS = COURIERS.map((c) => c.id) as [CourierId, ...CourierId[]];

export function courierName(id: string | null | undefined): string | null {
  if (!id) return null;
  return COURIERS.find((c) => c.id === id)?.name ?? null;
}

/** Only http(s) links are ever rendered to customers. */
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Order numbers are matched case- and whitespace-insensitively. */
export function normalizeOrderNumber(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

/** Sri Lankan phone → last 9 national digits (handles +94 / 0094 / 0 prefixes). */
export function normalizePhone(s: string): string {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/** The guest proves ownership with the order's email or delivery phone. */
export function contactMatches(
  contact: string,
  order: { email: string | null; phone?: string | null },
): boolean {
  const c = contact.trim();
  if (!c) return false;
  if (c.includes("@")) return !!order.email && order.email.trim().toLowerCase() === c.toLowerCase();
  const p = normalizePhone(c);
  return p.length === 9 && !!order.phone && normalizePhone(order.phone) === p;
}

// ---- status timeline ----

export type TimelineStepId = "placed" | "confirmed" | "packed" | "shipped" | "delivered";
export interface TimelineStep { id: TimelineStepId; label: string; done: boolean; at: string | null }
export interface TrackingTimeline {
  steps: TimelineStep[];
  /** Set when the order left the normal flow. */
  terminal: { status: "cancelled" | "refunded" | "partially_refunded"; at: string | null } | null;
}

const STEP_LABELS: Record<TimelineStepId, string> = {
  placed: "Order placed", confirmed: "Payment confirmed", packed: "Packed", shipped: "Shipped", delivered: "Delivered",
};
const STATUS_STEP: Partial<Record<OrderStatus, TimelineStepId>> = {
  paid: "confirmed", fulfilled: "packed", shipped: "shipped", delivered: "delivered",
};
const ORDER: TimelineStepId[] = ["placed", "confirmed", "packed", "shipped", "delivered"];

/** Status-change events, oldest first (from audit_logs: after.status). */
export interface StatusEvent { status: string; at: string }

export function buildTimeline(input: {
  status: OrderStatus; paymentMethod: "online" | "cod"; createdAt: string; events: StatusEvent[];
}): TrackingTimeline {
  const cod = input.paymentMethod === "cod";
  // COD orders are confirmed at checkout and paid on delivery — no "payment" step.
  const ids = cod ? ORDER.filter((s) => s !== "confirmed") : ORDER;
  const at: Partial<Record<TimelineStepId, string>> = { placed: input.createdAt };
  let reached = 0;
  for (const e of input.events) {
    const step = STATUS_STEP[e.status as OrderStatus];
    if (step && ids.includes(step)) {
      at[step] ??= e.at;
      reached = Math.max(reached, ids.indexOf(step));
    }
  }
  // Current status wins even if events are missing (e.g. older orders).
  const cur = STATUS_STEP[input.status];
  if (cur && ids.includes(cur)) reached = Math.max(reached, ids.indexOf(cur));
  // Refunded online orders were at least paid.
  if (!cod && (input.status === "refunded" || input.status === "partially_refunded")) reached = Math.max(reached, 1);

  const steps = ids.map((id, i) => ({ id, label: STEP_LABELS[id], done: i <= reached, at: i <= reached ? at[id] ?? null : null }));
  const terminalStatus = input.status === "cancelled" || input.status === "refunded" || input.status === "partially_refunded"
    ? input.status : null;
  const terminal = terminalStatus
    ? { status: terminalStatus, at: [...input.events].reverse().find((e) => e.status === terminalStatus)?.at ?? null }
    : null;
  return { steps, terminal };
}
