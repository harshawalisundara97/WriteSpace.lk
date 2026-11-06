import { createAdminClient } from "@/lib/supabase/admin";

export default async function AuditLogPage() {
  const db = createAdminClient();
  const { data: logs } = await db
    .from("audit_logs")
    .select("id,action,entity,entity_id,after,created_at,actor")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Audit log</h1>
      <p className="text-sm text-ink-soft">Every financial or destructive action, newest first.</p>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Entity</th><th className="px-4 py-2">Details</th></tr>
          </thead>
          <tbody>
            {(logs ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-soft">No activity yet.</td></tr>}
            {(logs ?? []).map((l) => (
              <tr key={l.id} className="border-t border-line align-top">
                <td className="px-4 py-2 text-ink-soft whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-medium">{l.action}</td>
                <td className="px-4 py-2 text-ink-soft">{l.entity}{l.entity_id ? `#${String(l.entity_id).slice(0, 8)}` : ""}</td>
                <td className="px-4 py-2 font-mono text-xs text-ink-soft">{l.after ? JSON.stringify(l.after) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
