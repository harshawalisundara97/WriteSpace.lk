import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/guards";
import { StaffManager } from "@/components/admin/staff-manager";

export default async function AdminStaffPage() {
  const ctx = await requireAdmin();
  if (!hasSupabase()) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold">Staff & roles</h1>
        <StaffManager staff={[{ id: ctx.userId, role: "admin", permissions: [], email: "demo-admin (demo mode)", self: true }]} />
      </div>
    );
  }
  const db = createAdminClient();
  const { data: admins } = await db.from("admin_users").select("id,role,permissions");
  const ids = (admins ?? []).map((a) => a.id);
  const { data: people } = ids.length
    ? await db.from("customers").select("id,email").in("id", ids)
    : { data: [] as { id: string; email: string }[] };
  const emailById = new Map((people ?? []).map((p) => [p.id, p.email]));
  const staff = (admins ?? []).map((a) => ({
    id: a.id, role: a.role as "admin" | "staff", permissions: (a.permissions as string[]) ?? [],
    email: emailById.get(a.id) ?? a.id, self: a.id === ctx.userId,
  }));
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Staff & roles</h1>
      <StaffManager staff={staff} />
    </div>
  );
}
