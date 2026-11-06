"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

export async function setCustomerBlocked(customerId: string, blocked: boolean): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("customers:write");
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
