import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { balanceAt, toLoyaltySettings } from "./rules";
import type { LoyaltyRow, MyLoyalty } from "./queries";
import { demoLoyalty } from "@/lib/demo/data";

/** Admin view of any customer's points (service role). */
export async function getAdminCustomerLoyalty(customerId: string): Promise<MyLoyalty> {
  if (!hasSupabase()) return demoLoyalty();
  const db = createAdminClient();
  const [{ data: settings }, { data: rows }] = await Promise.all([
    db.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("loyalty_ledger")
      .select("id,kind,points,note,created_at,expires_at,orders(order_number)")
      .eq("customer_id", customerId).order("created_at", { ascending: false }).limit(200),
  ]);
  const s = toLoyaltySettings(settings);
  const history: LoyaltyRow[] = (rows ?? []).map((r) => {
    const o = r.orders as { order_number?: string } | { order_number?: string }[] | null;
    const num = Array.isArray(o) ? o[0]?.order_number : o?.order_number;
    return { id: r.id, kind: r.kind, points: r.points, note: r.note, created_at: r.created_at, expires_at: r.expires_at, order_number: num ?? null };
  });
  return { enabled: s.loyalty_enabled, balance: balanceAt(history), pointValueMinor: s.loyalty_point_value_minor, history };
}
