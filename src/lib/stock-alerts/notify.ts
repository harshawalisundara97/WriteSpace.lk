import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { renderBackInStock, sendEmail } from "@/lib/email/marketing";
import { availableUnits } from "@/lib/stock-alerts/rules";

type AdminDb = ReturnType<typeof createAdminClient>;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Email everyone waiting on these variants that are now sellable, then mark
 * their alerts notified. Called after stock is added (admin adjust, CSV import).
 * Never throws — a failed notification must not fail the stock change.
 */
export async function notifyBackInStock(db: AdminDb, variantIds: string[], actor: string | null = null): Promise<number> {
  if (variantIds.length === 0) return 0;
  try {
    const { data: variants } = await db
      .from("product_variants")
      .select("id,name,is_active,inventory(on_hand,reserved),product:products(name,slug,status)")
      .in("id", variantIds);
    type V = { id: string; name: string | null; is_active: boolean;
      inventory: { on_hand: number; reserved: number } | null;
      product: { name: string; slug: string; status: string } | null };
    const ready = ((variants ?? []) as unknown as V[]).filter(
      (v) => v.is_active && v.product?.status === "published" && availableUnits(v.inventory) > 0,
    );
    let sent = 0;
    for (const v of ready) {
      const { data: alerts } = await db.from("stock_alerts").select("id,email")
        .eq("variant_id", v.id).is("notified_at", null).limit(500);
      if (!alerts?.length) continue;
      const msg = renderBackInStock({ productName: v.product!.name, variantName: v.name, url: `${SITE}/products/${v.product!.slug}` });
      const done: string[] = [];
      for (const a of alerts) if (await sendEmail(a.email, msg)) done.push(a.id);
      if (done.length) {
        await db.from("stock_alerts").update({ notified_at: new Date().toISOString() }).in("id", done);
        await db.from("audit_logs").insert({ actor, action: "stock_alert.notified", entity: "product_variants", entity_id: v.id, after: { count: done.length } });
        sent += done.length;
      }
    }
    return sent;
  } catch (e) {
    console.error("[stock-alerts] notify failed", e);
    return 0;
  }
}
