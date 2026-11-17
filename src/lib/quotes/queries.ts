import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { isQuoteExpired, isQuoteToken, type QuoteStatus } from "./rules";

/** Buyer-facing quote by secret link token (service role; token is the credential). */
export async function getQuoteByToken(token: string) {
  if (!hasSupabase() || !isQuoteToken(token)) return null;
  const db = createAdminClient();
  const { data: q } = await db.from("quotes")
    .select("id,quote_number,status,company,contact_name,phone,shipping_minor,subtotal_minor,total_minor,valid_until,created_at,po_number")
    .eq("access_token", token).maybeSingle();
  if (!q) return null;
  const { data: items } = await db.from("quote_items").select("id,name,sku,qty,list_unit_minor,quoted_unit_minor").eq("quote_id", q.id).order("name");
  return {
    quote: { ...q, status: (isQuoteExpired(q) ? "expired" : q.status) as QuoteStatus },
    items: (items ?? []) as { id: string; name: string; sku: string | null; qty: number; list_unit_minor: number; quoted_unit_minor: number | null }[],
  };
}
