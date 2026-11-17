"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { getCartLines } from "@/lib/cart/actions";
import { getStoreSettings } from "@/lib/catalog/queries";
import { quoteRequestSchema, quoteAcceptSchema } from "@/lib/validation/quote";
import { buildQuoteItems, canAcceptQuote, quoteNumber, quoteTotals } from "@/lib/quotes/rules";
import { sendQuoteRequestEmails, sendQuoteAcceptedStaff } from "@/lib/email/quote";

export type QuoteRequestResult = { ok: true; quoteNumber: string; demo?: boolean } | { ok: false; error: string };

/** Turn the current cart into a quote request (TASK-NEXT-009b). The cart is left as is. */
export async function requestQuote(raw: unknown): Promise<QuoteRequestResult> {
  const parsed = quoteRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const { website, qtys, company, phone, notes, contact_name, email } = parsed.data;
  const now = new Date();
  const number = quoteNumber(now, randomBytes(3).toString("hex"));
  if (website) return { ok: true, quoteNumber: number }; // honeypot: pretend success

  const lines = await getCartLines();
  const items = buildQuoteItems(lines, qtys);
  if (items.length === 0) return { ok: false, error: "Add items to your cart before requesting a quote" };
  const totals = quoteTotals(items);
  const settings = await getStoreSettings();
  const emailData = {
    quoteNumber: number, contactName: contact_name, company: company || null, email, phone: phone || null, notes: notes || null,
    items, listSubtotalMinor: totals.list_subtotal_minor, currency: settings.currency,
  };
  if (!hasSupabase()) return { ok: true, quoteNumber: number, demo: true };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const db = createAdminClient();
  const { data: quote, error } = await db.from("quotes").insert({
    quote_number: number, customer_id: auth.user?.id ?? null, status: "requested",
    contact_name, company: company || null, email, phone: phone || null, notes: notes || null,
    subtotal_minor: totals.subtotal_minor, total_minor: totals.total_minor,
  }).select("id").single();
  if (error || !quote) return { ok: false, error: "Could not send your request. Please try again." };

  const { error: itemsErr } = await db.from("quote_items").insert(items.map((i) => ({ ...i, quote_id: quote.id })));
  if (itemsErr) {
    await db.from("quotes").delete().eq("id", quote.id);
    return { ok: false, error: "Could not send your request. Please try again." };
  }
  await db.from("audit_logs").insert({
    actor: auth.user?.id ?? null, action: "quote.requested", entity: "quotes", entity_id: quote.id,
    after: { quote_number: number, lines: items.length, list_subtotal_minor: totals.list_subtotal_minor },
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await sendQuoteRequestEmails({ ...emailData, adminUrl: `${site}/admin/quotes/${quote.id}` }, process.env.CONTACT_INBOX ?? settings.support_email);
  return { ok: true, quoteNumber: number };
}

/** Buyer accepts a priced, unexpired quote via its secret link (TASK-NEXT-009d). */
export async function acceptQuote(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = quoteAcceptSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  if (!hasSupabase()) return { ok: false, error: "Demo mode — quotes can't be accepted." };
  const { token, po_number, ...addr } = parsed.data;
  const db = createAdminClient();
  const { data: q } = await db.from("quotes")
    .select("id,quote_number,status,valid_until,contact_name,company,email,total_minor").eq("access_token", token).maybeSingle();
  if (!q) return { ok: false, error: "Quote not found" };
  const check = canAcceptQuote(q);
  if (!check.ok) return { ok: false, error: check.reason };
  const now = new Date().toISOString();
  // Conditional on status so a double-click / race can't accept twice.
  const { data: updated } = await db.from("quotes").update({
    status: "accepted", accepted_at: now, updated_at: now, po_number: po_number || null,
    delivery_address: { ...addr, line2: addr.line2 || "", district: addr.district || "", postal_code: addr.postal_code || "" },
  }).eq("id", q.id).eq("status", "priced").select("id").maybeSingle();
  if (!updated) return { ok: false, error: "This quote can't be accepted" };
  await db.from("audit_logs").insert({
    actor: null, action: "quote.accepted", entity: "quotes", entity_id: q.id,
    before: { status: "priced" }, after: { status: "accepted", po_number: po_number || null },
  });
  const settings = await getStoreSettings();
  const inbox = process.env.CONTACT_INBOX ?? settings.support_email;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (inbox) await sendQuoteAcceptedStaff(inbox, { quoteNumber: q.quote_number, buyer: q.company ?? q.contact_name, totalMinor: q.total_minor, poNumber: po_number || null, adminUrl: `${site}/admin/quotes/${q.id}` });
  return { ok: true };
}
