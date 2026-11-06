import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { demoProducts } from "@/lib/demo/data";

export interface InventoryRow {
  variant_id: string; sku: string; variant_name: string | null; product_name: string;
  on_hand: number; reserved: number; low_stock_threshold: number;
}

export async function getAdminInventory(): Promise<InventoryRow[]> {
  if (!hasSupabase()) {
    return demoProducts.flatMap((p) =>
      p.product_variants.map((v) => ({
        variant_id: v.id, sku: v.sku, variant_name: v.name, product_name: p.name,
        on_hand: v.inventory?.on_hand ?? 0, reserved: v.inventory?.reserved ?? 0, low_stock_threshold: v.inventory?.low_stock_threshold ?? 5,
      })),
    );
  }
  const db = createAdminClient();
  const { data } = await db
    .from("inventory")
    .select("variant_id,on_hand,reserved,low_stock_threshold,variant:product_variants(sku,name,product:products(name))")
    .order("on_hand", { ascending: true });
  type Row = { variant_id: string; on_hand: number; reserved: number; low_stock_threshold: number; variant: { sku: string; name: string | null; product: { name: string } | null } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    variant_id: r.variant_id, sku: r.variant?.sku ?? "", variant_name: r.variant?.name ?? null,
    product_name: r.variant?.product?.name ?? "—", on_hand: r.on_hand, reserved: r.reserved, low_stock_threshold: r.low_stock_threshold,
  }));
}
