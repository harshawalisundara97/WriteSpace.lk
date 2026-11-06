import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { demoSettings } from "@/lib/demo/data";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const db = hasSupabase() ? createAdminClient() : null;
  const { data } = db ? await db.from("store_settings").select("*").eq("id", 1).maybeSingle() : { data: demoSettings };
  const initial = {
    store_name: data?.store_name ?? "WriteSpace.lk",
    currency: data?.currency ?? "LKR",
    flat_shipping_minor: data?.flat_shipping_minor ?? 35000,
    free_shipping_threshold_minor: data?.free_shipping_threshold_minor ?? null,
    tax_rate_bps: data?.tax_rate_bps ?? 0,
    support_email: data?.support_email ?? null,
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <SettingsForm initial={initial} />
    </div>
  );
}
