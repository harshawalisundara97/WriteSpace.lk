"use client";

import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/store/status-badge";
import { EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";
import type { OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string; order_number: string; email: string; status: OrderStatus;
  total_minor: number; currency: string; created_at: string;
}

const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const columns: Column<OrderRow>[] = [
    { key: "order_number", header: "Order", sortable: true, sortValue: (r) => r.order_number, cell: (r) => <span className="font-medium text-accent">{r.order_number}</span> },
    { key: "email", header: "Email", sortable: true, sortValue: (r) => r.email, cell: (r) => <span className="text-ink-soft">{r.email}</span> },
    { key: "created_at", header: "Date", sortable: true, sortValue: (r) => r.created_at, cell: (r) => <span className="text-ink-soft">{fmtDate(r.created_at)}</span> },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    { key: "total", header: "Total", align: "right", sortable: true, sortValue: (r) => r.total_minor, cell: (r) => formatMoney(r.total_minor, r.currency) },
  ];
  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/orders/${r.id}`}
      initialSort={{ key: "created_at", dir: "desc" }}
      empty={<EmptyState title="No orders yet" hint="Orders will appear here as customers check out." />}
    />
  );
}
