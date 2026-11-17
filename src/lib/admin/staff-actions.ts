"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm, type AdminContext } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { DEMO_MESSAGE } from "@/lib/validation/admin";
import {
  checkStaffChange, normalizePermissions, staffInputSchema, staffInviteSchema, type StaffRole,
} from "@/lib/auth/permissions";

type Result = { ok: boolean; error?: string };
type Db = ReturnType<typeof createAdminClient>;


async function loadTarget(db: Db, id: string) {
  const { data } = await db.from("admin_users").select("id,role,permissions").eq("id", id).maybeSingle();
  return data ? { id: data.id as string, role: data.role as StaffRole, permissions: (data.permissions as string[]) ?? [] } : null;
}

async function countAdmins(db: Db): Promise<number> {
  const { count } = await db.from("admin_users").select("id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

const actorOf = (ctx: AdminContext) => ({ id: ctx.userId, role: ctx.role as StaffRole, permissions: ctx.permissions });

// Grant admin/staff access to an EXISTING account (they must have registered).
// By design no invite email is sent and no auth user is created.
export async function inviteStaff(email: string, role: StaffRole, permissions: string[]): Promise<Result> {
  const perm = await checkPerm("staff:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = staffInviteSchema.safeParse({ email, role, permissions });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { data: customer } = await db.from("customers").select("id").eq("email", parsed.data.email).maybeSingle();
  if (!customer) return { ok: false, error: "No account with that email. Ask them to register first." };
  if (await loadTarget(db, customer.id)) return { ok: false, error: "That account already has access — edit it in the list below." };
  const next = { role: parsed.data.role, permissions: normalizePermissions(parsed.data.role, parsed.data.permissions) };
  const denied = checkStaffChange({ actor: actorOf(ctx), target: null, next, adminCount: await countAdmins(db) });
  if (denied) return { ok: false, error: denied };
  const { error } = await db.from("admin_users").insert({ id: customer.id, ...next });
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.invite", entity: "admin_users", entity_id: customer.id, after: next });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function setStaff(userId: string, role: StaffRole, permissions: string[]): Promise<Result> {
  const perm = await checkPerm("staff:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = staffInputSchema.safeParse({ role, permissions });
  if (!parsed.success || typeof userId !== "string" || !userId) return { ok: false, error: "Invalid input" };
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const target = await loadTarget(db, userId);
  if (!target) return { ok: false, error: "Staff member not found." };
  const next = { role: parsed.data.role, permissions: normalizePermissions(parsed.data.role, parsed.data.permissions) };
  const denied = checkStaffChange({ actor: actorOf(ctx), target, next, adminCount: await countAdmins(db) });
  if (denied) return { ok: false, error: denied };
  const { error } = await db.from("admin_users").update(next).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.update", entity: "admin_users", entity_id: userId, before: { role: target.role, permissions: target.permissions }, after: next });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function removeStaff(userId: string): Promise<Result> {
  const perm = await checkPerm("staff:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  if (typeof userId !== "string" || !userId) return { ok: false, error: "Invalid input" };
  if (userId === ctx.userId) return { ok: false, error: "You can't remove your own access." };
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const target = await loadTarget(db, userId);
  if (!target) return { ok: false, error: "Staff member not found." };
  const denied = checkStaffChange({ actor: actorOf(ctx), target, next: null, adminCount: await countAdmins(db) });
  if (denied) return { ok: false, error: denied };
  const { error } = await db.from("admin_users").delete().eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "staff.remove", entity: "admin_users", entity_id: userId, before: { role: target.role, permissions: target.permissions } });
  revalidatePath("/admin/staff");
  return { ok: true };
}
