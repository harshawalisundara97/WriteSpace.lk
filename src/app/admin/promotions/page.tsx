import { createAdminClient } from "@/lib/supabase/admin";
import { PromotionsManager } from "@/components/admin/promotions-manager";
import type { Promotion, Banner } from "@/lib/types";

export default async function AdminPromotionsPage() {
  const db = createAdminClient();
  const [{ data: promos }, { data: banners }] = await Promise.all([
    db.from("promotions").select("*").order("priority", { ascending: false }),
    db.from("banners").select("*").order("position"),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Promotions</h1>
      <PromotionsManager promotions={(promos ?? []) as Promotion[]} banners={(banners ?? []) as Banner[]} />
    </div>
  );
}
