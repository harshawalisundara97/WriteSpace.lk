import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { AuditTable, type AuditRow } from "@/components/admin/audit-table";
import { PageHeader } from "@/components/admin/ui";
import { requireAdminRole } from "@/lib/auth/guards";

export default async function AuditLogPage() {
  await requireAdminRole();
  const db = hasSupabase() ? createAdminClient() : null;
  const logs = db
    ? (await db.from("audit_logs").select("id,action,entity,entity_id,after,created_at").order("created_at", { ascending: false }).limit(200)).data
    : [];
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Every financial or destructive action, newest first." />
      <AuditTable rows={(logs ?? []) as AuditRow[]} />
    </div>
  );
}
