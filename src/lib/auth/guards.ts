import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/types";
import { hasSupabase } from "@/lib/env";

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

export function can(ctx: AdminContext, permission: string): boolean {
  return ctx.role === "admin" || ctx.permissions.includes(permission);
}

// Throw-style check for server actions.
export async function requirePerm(permission: string): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!can(ctx, permission)) throw new Error("Forbidden: missing permission " + permission);
  return ctx;
}
