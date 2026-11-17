import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { availableUnits, summariseDemand, type DemandSummary } from "@/lib/stock-alerts/rules";

/** Pending back-in-stock requests grouped per variant (admin inventory page). */
export async function getStockAlertDemand(): Promise<DemandSummary[]> {
  if (!hasSupabase()) return [];
  const db = createAdminClient();
  const { data } = await db.from("stock_alerts")
    .select("created_at,variant:product_variants(id,sku,name,inventory(on_hand,reserved),product:products(name,slug))")
    .is("notified_at", null).limit(2000);
  type R = { created_at: string; variant: { id: string; sku: string; name: string | null;
    inventory: { on_hand: number; reserved: number } | null; product: { name: string; slug: string } | null } | null };
  return summariseDemand(((data ?? []) as unknown as R[]).filter((r) => r.variant?.product).map((r) => ({
    created_at: r.created_at,
    variant_id: r.variant!.id, sku: r.variant!.sku, variant_name: r.variant!.name,
    product_name: r.variant!.product!.name, product_slug: r.variant!.product!.slug,
    available: availableUnits(r.variant!.inventory),
  })));
}
