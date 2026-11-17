import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/types";
import { hasSupabase } from "@/lib/env";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export interface AdminContext {
  userId: string;
  role: AppRole;
  permissions: string[];
}

// Resolve the current admin/staff context, or null if not an admin.
export async function getAdminContext(): Promise<AdminContext | null> {
  if (!hasSupabase()) return { userId: "demo-admin", role: "admin", permissions: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const db = createAdminClient();
  const { data } = await db.from("admin_users").select("role,permissions").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { userId: user.id, role: data.role as AppRole, permissions: (data.permissions as string[]) ?? [] };
}

// Hard gate for admin pages — redirects if not authorized.
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login?next=/admin");
  return ctx;
}

export function can(ctx: AdminContext, permission: Permission): boolean {
  return hasPermission(ctx.role === "admin" ? "admin" : "staff", ctx.permissions, permission);
}

// Hard gate for admin-role-only pages (e.g. audit log) — staff are sent back.
export async function requireAdminRole(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.role !== "admin") redirect("/admin");
  return ctx;
}

// Throw-style check for server actions.
export async function requirePerm(permission: Permission): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!can(ctx, permission)) throw new Error("Forbidden: missing permission " + permission);
  return ctx;
}

export type PermCheck = { ok: true; ctx: AdminContext } | { ok: false; error: string };

// Non-throwing check for server actions: refusal comes back as { ok:false, error }
// so the client can toast it instead of hitting the error boundary.
export async function checkPerm(permission: Permission): Promise<PermCheck> {
  const ctx = await requireAdmin();
  if (!can(ctx, permission)) return { ok: false, error: "You don't have permission to do that (" + permission + ")." };
  return { ok: true, ctx };
}
