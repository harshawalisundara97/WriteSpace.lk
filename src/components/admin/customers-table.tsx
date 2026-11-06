"use client";

import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

export interface CustomerRow {
  id: string; name: string; email: string; orders: number; spent: number; is_blocked: boolean;
}

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const columns: Column<CustomerRow>[] = [
    { key: "name", header: "Name", sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium text-accent">{r.name || "—"}</span> },
    { key: "email", header: "Email", sortable: true, sortValue: (r) => r.email, cell: (r) => <span className="text-ink-soft">{r.email}</span> },
    { key: "orders", header: "Orders", align: "right", sortable: true, sortValue: (r) => r.orders, cell: (r) => r.orders },
    { key: "spent", header: "Spent", align: "right", sortable: true, sortValue: (r) => r.spent, cell: (r) => formatMoney(r.spent) },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => (r.is_blocked ? 1 : 0), cell: (r) => r.is_blocked ? <Badge tone="danger">Blocked</Badge> : <span className="text-ink-soft">Active</span> },
  ];
  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/customers/${r.id}`} initialSort={{ key: "spent", dir: "desc" }}
      empty={<EmptyState title="No customers yet" hint="Customer accounts will appear here." />} />
  );
}
