"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

export const ALL_PERMISSIONS = [
  "orders:write", "refunds:create", "products:write", "inventory:write",
  "promotions:write", "customers:write", "settings:write", "staff:write",
] as const;

// Grant admin/staff access to an EXISTING account (they must have registered).
export async function inviteStaff(email: string, role: "admin" | "staff", permissions: string[]): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("staff:write");
  const db = createAdminClient();
  const { data: customer } = await db.from("customers").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (!customer) return { ok: false, error: "No account with that email. Ask them to register first." };
  const { error } = await db.from("admin_users").upsert(
    { id: customer.id, role, permissions: role === "admin" ? [] : permissions },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.invite", entity: "admin_users", entity_id: customer.id, after: { role, permissions } });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function setStaff(userId: string, role: "admin" | "staff", permissions: string[]): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("staff:write");
  const db = createAdminClient();
  const { error } = await db.from("admin_users").update({ role, permissions: role === "admin" ? [] : permissions }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.update", entity: "admin_users", entity_id: userId, after: { role, permissions } });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function removeStaff(userId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("staff:write");
  if (userId === ctx.userId) return { ok: false, error: "You can't remove your own access." };
  const db = createAdminClient();
  await db.from("admin_users").delete().eq("id", userId);
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.remove", entity: "admin_users", entity_id: userId });
  revalidatePath("/admin/staff");
  return { ok: true };
}
