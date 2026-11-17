"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { DEMO_MESSAGE, parseInput, loyaltyAdjustSchema } from "@/lib/validation/admin";
import { toLoyaltySettings, expiryFor } from "@/lib/loyalty/rules";
import { customerBalance } from "@/lib/loyalty/service";

export async function setCustomerBlocked(customerId: string, blocked: boolean): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("customers:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const db = createAdminClient();
  await db.from("customers").update({ is_blocked: blocked }).eq("id", customerId);
  await db.from("audit_logs").insert({
    actor: ctx.userId, action: blocked ? "customer.block" : "customer.unblock",
    entity: "customers", entity_id: customerId,
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}


/** Manually credit (+) or debit (−) a customer's points with a reason. Audited. */
export async function adjustLoyaltyPoints(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const perm = await checkPerm("customers:write");
  if (!perm.ok) return perm;
  const parsed = parseInput(loyaltyAdjustSchema, raw, "Invalid adjustment");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const { customer_id, points, note } = parsed.data;
  const db = createAdminClient();
  const { data: customer } = await db.from("customers").select("id").eq("id", customer_id).maybeSingle();
  if (!customer) return { ok: false, error: "Customer not found" };
  const before = await customerBalance(db, customer_id);
  if (points < 0 && -points > before) return { ok: false, error: `Customer only has ${before} points` };
  const { data: settings } = await db.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const expires = points > 0 ? expiryFor(toLoyaltySettings(settings), new Date()) : null;
  const { error } = await db.from("loyalty_ledger").insert({
    customer_id, kind: "adjust", points, note, actor_id: perm.ctx.userId, expires_at: expires?.toISOString() ?? null,
  });
  if (error) return { ok: false, error: "Could not save the adjustment" };
  await db.from("audit_logs").insert({
    actor: perm.ctx.userId, action: "loyalty.adjust", entity: "customers", entity_id: customer_id,
    before: { balance: before }, after: { points, note, balance: before + points },
  });
  revalidatePath(`/admin/customers/${customer_id}`);
  return { ok: true };
}
