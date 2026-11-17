import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { isQuoteExpired, type QuoteStatus } from "@/lib/quotes/rules";

export interface AdminQuoteRow {
  id: string; quote_number: string; status: QuoteStatus; company: string | null; contact_name: string; email: string;
  total_minor: number; created_at: string; valid_until: string | null;
}

/** Shown status: a priced quote past valid_until reads as expired even before anything writes it. */
const shown = (q: { status: QuoteStatus; valid_until: string | null }): QuoteStatus => (isQuoteExpired(q) ? "expired" : q.status);

export async function getAdminQuotes(filter: { status?: string; q?: string } = {}): Promise<AdminQuoteRow[]> {
  if (!hasSupabase()) return [];
  const db = createAdminClient();
  let query = db.from("quotes")
    .select("id,quote_number,status,company,contact_name,email,total_minor,created_at,valid_until")
    .order("created_at", { ascending: false }).limit(200);
  if (filter.status && filter.status !== "expired") query = query.eq("status", filter.status);
  if (filter.q) {
    const term = filter.q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`quote_number.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`);
  }
  const { data } = await query;
  const rows = ((data ?? []) as AdminQuoteRow[]).map((r) => ({ ...r, status: shown(r) }));
  return filter.status ? rows.filter((r) => r.status === filter.status) : rows;
}

export interface AdminQuoteItem { id: string; variant_id: string | null; name: string; sku: string | null; qty: number; list_unit_minor: number; quoted_unit_minor: number | null; available: number | null }

export async function getAdminQuote(id: string) {
  if (!hasSupabase()) return null;
  const db = createAdminClient();
  const { data: quote } = await db.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quote) return null;
  const { data: items } = await db.from("quote_items")
    .select("id,variant_id,name,sku,qty,list_unit_minor,quoted_unit_minor").eq("quote_id", id).order("name");
  const ids = (items ?? []).map((i) => i.variant_id).filter(Boolean) as string[];
  const { data: inv } = ids.length ? await db.from("inventory").select("variant_id,on_hand,reserved").in("variant_id", ids) : { data: [] };
  const avail = new Map((inv ?? []).map((r) => [r.variant_id, r.on_hand - r.reserved]));
  return {
    quote: { ...quote, status: shown(quote) } as typeof quote & { status: QuoteStatus },
    items: (items ?? []).map((i) => ({ ...i, available: i.variant_id ? avail.get(i.variant_id) ?? 0 : null })) as AdminQuoteItem[],
  };
}
