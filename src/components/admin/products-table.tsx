"use client";

import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

export interface ProductRow {
  id: string; name: string; variants: number; stock: number; fromMinor: number; currency: string; status: "draft" | "published";
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const columns: Column<ProductRow>[] = [
    { key: "name", header: "Name", sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium text-accent">{r.name}</span> },
    { key: "variants", header: "Variants", align: "right", sortable: true, sortValue: (r) => r.variants, cell: (r) => <span className="text-ink-soft">{r.variants}</span> },
    { key: "stock", header: "Stock", align: "right", sortable: true, sortValue: (r) => r.stock, cell: (r) => <span className={r.stock <= 5 ? "font-medium text-gold" : "text-ink-soft"}>{r.stock}</span> },
    { key: "from", header: "From", align: "right", sortable: true, sortValue: (r) => r.fromMinor, cell: (r) => r.fromMinor ? formatMoney(r.fromMinor, r.currency) : "—" },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, cell: (r) => <Badge tone={r.status === "published" ? "success" : "neutral"}>{r.status}</Badge> },
  ];
  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/products/${r.id}`} initialSort={{ key: "name", dir: "asc" }}
      empty={<EmptyState title="No products yet" hint="Create your first product to start selling." />} />
  );
}
