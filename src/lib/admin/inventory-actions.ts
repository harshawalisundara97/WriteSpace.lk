"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

export async function adjustInventory(variantId: string, newOnHand: number, reason: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("inventory:write");
  if (newOnHand < 0) return { ok: false, error: "Stock can't be negative" };
  const db = createAdminClient();
  const { data: inv, error: readErr } = await db.from("inventory").select("on_hand").eq("variant_id", variantId).maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const prev = inv?.on_hand ?? 0;
  const change = newOnHand - prev;
  const { error } = await db.from("inventory").update({ on_hand: newOnHand }).eq("variant_id", variantId);
  if (error) return { ok: false, error: error.message };
  if (change !== 0) {
    await db.from("inventory_ledger").insert({ variant_id: variantId, change, reason: "manual_adjust", note: reason || null, actor: ctx.userId });
  }
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "inventory.adjust", entity: "inventory", entity_id: variantId, before: { on_hand: prev }, after: { on_hand: newOnHand, reason } });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return { ok: true };
}
