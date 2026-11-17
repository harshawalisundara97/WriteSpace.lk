import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { balanceAt, toLoyaltySettings, type LedgerEntry } from "./rules";
import { demoLoyalty } from "@/lib/demo/data";

export interface LoyaltyRow extends LedgerEntry {
  id: string;
  kind: "earn" | "redeem" | "adjust" | "reverse";
  note: string | null;
  order_number: string | null;
}

export interface MyLoyalty {
  enabled: boolean;
  balance: number;
  pointValueMinor: number;
  history: LoyaltyRow[];
}

/** Signed-in customer's points (RLS limits rows to their own ledger). */
export async function getMyLoyalty(): Promise<MyLoyalty> {
  if (!hasSupabase()) return demoLoyalty();
  const supabase = await createClient();
  const [{ data: settings }, { data: rows }] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("loyalty_ledger")
      .select("id,kind,points,note,created_at,expires_at,orders(order_number)")
      .order("created_at", { ascending: false }).limit(200),
  ]);
  const s = toLoyaltySettings(settings);
  const history: LoyaltyRow[] = (rows ?? []).map((r) => {
    const o = r.orders as { order_number?: string } | { order_number?: string }[] | null;
    const num = Array.isArray(o) ? o[0]?.order_number : o?.order_number;
    return { id: r.id, kind: r.kind, points: r.points, note: r.note, created_at: r.created_at, expires_at: r.expires_at, order_number: num ?? null };
  });
  return { enabled: s.loyalty_enabled, balance: balanceAt(history), pointValueMinor: s.loyalty_point_value_minor, history };
}

