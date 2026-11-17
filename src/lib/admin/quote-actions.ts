"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { DEMO_MESSAGE } from "@/lib/validation/admin";
import { quotePricingSchema } from "@/lib/validation/quote";
import { canQuoteTransition, canSendQuote, quoteTotals, validUntil, type QuoteStatus } from "@/lib/quotes/rules";
import { sendQuotePriced } from "@/lib/email/quote";
import { orderNumber } from "@/lib/orders/number";

type Result = { ok: boolean; error?: string };
const EDITABLE: QuoteStatus[] = ["requested", "priced", "expired"];

/** Save line prices / shipping / notes. With send=true, also issue the quote to the buyer (→ priced). */
async function price(raw: unknown, send: boolean): Promise<Result> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  const parsed = quotePricingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid prices" };
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const p = parsed.data;
  const db = createAdminClient();

  const { data: quote } = await db.from("quotes")
    .select("id,quote_number,status,email,contact_name,access_token").eq("id", p.quote_id).maybeSingle();
  if (!quote) return { ok: false, error: "Quote not found" };
  if (!EDITABLE.includes(quote.status as QuoteStatus)) return { ok: false, error: `A ${quote.status} quote can't be re-priced` };

  const { data: items } = await db.from("quote_items").select("id,name,sku,qty,list_unit_minor").eq("quote_id", quote.id);
  const byId = new Map(p.lines.map((l) => [l.id, l.quoted_unit_minor]));
  const lines = (items ?? []).map((i) => ({ ...i, quoted_unit_minor: byId.has(i.id) ? byId.get(i.id)! : null }));
  if (p.lines.some((l) => !lines.find((i) => i.id === l.id))) return { ok: false, error: "Quote lines changed — reload the page" };
  if (send) {
    const check = canSendQuote(lines);
    if (!check.ok) return { ok: false, error: check.reason };
    if (!canQuoteTransition(quote.status as QuoteStatus, "priced")) return { ok: false, error: "This quote can't be sent" };
  }

  for (const l of lines) {
    const { error } = await db.from("quote_items").update({ quoted_unit_minor: l.quoted_unit_minor }).eq("id", l.id);
    if (error) return { ok: false, error: "Could not save prices" };
  }
  const totals = quoteTotals(lines, p.shipping_minor);
  const now = new Date();
  const until = validUntil(now, p.valid_days);
  const { error } = await db.from("quotes").update({
    shipping_minor: p.shipping_minor, subtotal_minor: totals.subtotal_minor, total_minor: totals.total_minor,
    admin_notes: p.admin_notes || null, updated_at: now.toISOString(),
    ...(send ? { status: "priced", valid_until: until.toISOString(), sent_at: now.toISOString() } : {}),
  }).eq("id", quote.id);
  if (error) return { ok: false, error: "Could not save quote" };

  await db.from("audit_logs").insert({
    actor: perm.ctx.userId, action: send ? "quote.sent" : "quote.priced", entity: "quotes", entity_id: quote.id,
    before: { status: quote.status },
    after: { status: send ? "priced" : quote.status, total_minor: totals.total_minor, ...(send ? { valid_until: until.toISOString() } : {}) },
  });

  if (send) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendQuotePriced({
      to: quote.email, contactName: quote.contact_name, quoteNumber: quote.quote_number,
      items: lines.map((l) => ({ name: l.name, sku: l.sku, qty: l.qty, unitMinor: l.quoted_unit_minor ?? l.list_unit_minor, listUnitMinor: l.list_unit_minor })),
      shippingMinor: p.shipping_minor, totalMinor: totals.total_minor, savingsMinor: totals.savings_minor,
      validUntil: until, url: `${site}/quote/view/${quote.access_token}`,
    });
  }
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quote.id}`);
  return { ok: true };
}

export async function saveQuotePrices(raw: unknown): Promise<Result> { return price(raw, false); }
export async function sendQuote(raw: unknown): Promise<Result> { return price(raw, true); }

export async function declineQuote(quoteId: string): Promise<Result> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { data: quote } = await db.from("quotes").select("id,status").eq("id", quoteId).maybeSingle();
  if (!quote) return { ok: false, error: "Quote not found" };
  if (!canQuoteTransition(quote.status as QuoteStatus, "declined")) return { ok: false, error: `A ${quote.status} quote can't be declined` };
  await db.from("quotes").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", quoteId);
  await db.from("audit_logs").insert({
    actor: perm.ctx.userId, action: "quote.declined", entity: "quotes", entity_id: quoteId,
    before: { status: quote.status }, after: { status: "declined" },
  });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true };
}

/**
 * Turn an accepted quote into an invoice-paid order (TASK-NEXT-009d): commit stock,
 * snapshot quoted prices, create an unpaid "invoice" payment, mark the quote converted.
 */
export async function convertQuoteToOrder(quoteId: string): Promise<Result & { orderId?: string }> {
  const perm = await checkPerm("orders:write");
  if (!perm.ok) return perm;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { data: q } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!q) return { ok: false, error: "Quote not found" };
  if (!canQuoteTransition(q.status as QuoteStatus, "converted")) return { ok: false, error: "Only an accepted quote can become an order" };
  if (!q.delivery_address) return { ok: false, error: "Quote has no delivery address" };

  const { data: rows } = await db.from("quote_items").select("variant_id,name,sku,qty,list_unit_minor,quoted_unit_minor").eq("quote_id", q.id);
  const items = (rows ?? []) as { variant_id: string | null; name: string; sku: string | null; qty: number; list_unit_minor: number; quoted_unit_minor: number | null }[];
  const gone = items.find((i) => !i.variant_id);
  if (gone) return { ok: false, error: `"${gone.name}" is no longer in the catalogue — re-quote without it` };
  const stock = items.map((i) => ({ variant_id: i.variant_id!, quantity: i.qty }));

  const { error: resErr } = await db.rpc("reserve_stock", { items: stock, hold_minutes: 15 });
  if (resErr) return { ok: false, error: "Not enough stock for this quote — adjust inventory first" };
  const { error: comErr } = await db.rpc("commit_stock", { items: stock });
  if (comErr) {
    await db.rpc("release_stock", { items: stock });
    return { ok: false, error: "Could not commit stock" };
  }

  const subtotal = items.reduce((s, i) => s + i.qty * (i.quoted_unit_minor ?? i.list_unit_minor), 0);
  const addr = q.delivery_address as Record<string, string>;
  const { data: order, error: oErr } = await db.from("orders").insert({
    order_number: orderNumber(), customer_id: q.customer_id, email: q.email, status: "pending_payment", currency: "LKR",
    subtotal_minor: subtotal, discount_minor: 0, shipping_minor: q.shipping_minor, tax_minor: 0, total_minor: subtotal + q.shipping_minor,
    payment_method: "invoice", placed_at: new Date().toISOString(), delivery_method: "standard",
    shipping_address: { full_name: q.contact_name, email: q.email, company: q.company ?? "", ...addr, country: "LK" },
    quote_id: q.id, po_number: q.po_number, notes: q.po_number ? `PO ${q.po_number} · from quote ${q.quote_number}` : `From quote ${q.quote_number}`,
  }).select("id,order_number,total_minor").single();
  if (oErr || !order) {
    await db.rpc("restock", { items: stock, who: perm.ctx.userId });
    return { ok: false, error: "Could not create the order" };
  }
  await db.from("order_items").insert(items.map((i) => {
    const unit = i.quoted_unit_minor ?? i.list_unit_minor;
    return { order_id: order.id, variant_id: i.variant_id, product_name: i.name, sku: i.sku ?? "", unit_price_minor: unit, quantity: i.qty, line_total_minor: unit * i.qty };
  }));
  await db.from("payments").insert({ order_id: order.id, provider: "invoice", status: "requires_payment", amount_minor: order.total_minor, currency: "LKR" });
  await db.from("quotes").update({ status: "converted", order_id: order.id, updated_at: new Date().toISOString() }).eq("id", q.id);
  await db.from("audit_logs").insert({
    actor: perm.ctx.userId, action: "quote.converted", entity: "quotes", entity_id: q.id,
    before: { status: q.status }, after: { status: "converted", order_id: order.id, order_number: order.order_number, total_minor: order.total_minor },
  });
  const { sendOrderConfirmation } = await import("@/lib/email/order");
  await sendOrderConfirmation({
    to: q.email, orderNumber: order.order_number, totalMinor: order.total_minor, currency: "LKR",
    items: items.map((i) => ({ name: i.name, quantity: i.qty, lineTotalMinor: i.qty * (i.quoted_unit_minor ?? i.list_unit_minor) })),
  }).catch(() => {});
  revalidatePath(`/admin/quotes/${q.id}`);
  revalidatePath("/admin/orders");
  return { ok: true, orderId: order.id };
}
