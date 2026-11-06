"use client";

import { DataTable, type Column } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/ui";

export interface AuditRow {
  id: string; action: string; entity: string; entity_id: string | null; after: unknown; created_at: string;
}

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const columns: Column<AuditRow>[] = [
    { key: "created_at", header: "When", sortable: true, sortValue: (r) => r.created_at, cell: (r) => <span className="whitespace-nowrap text-ink-soft">{fmt(r.created_at)}</span> },
    { key: "action", header: "Action", sortable: true, sortValue: (r) => r.action, cell: (r) => <span className="font-medium">{r.action}</span> },
    { key: "entity", header: "Entity", cell: (r) => <span className="text-ink-soft">{r.entity}{r.entity_id ? `#${String(r.entity_id).slice(0, 8)}` : ""}</span> },
    { key: "details", header: "Details", cell: (r) => <span className="font-mono text-xs text-ink-soft">{r.after ? JSON.stringify(r.after) : "—"}</span> },
  ];
  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} initialSort={{ key: "created_at", dir: "desc" }}
      empty={<EmptyState title="No activity yet" hint="Financial and destructive actions are logged here." />} />
  );
}
