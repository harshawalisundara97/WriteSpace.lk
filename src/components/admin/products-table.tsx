"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/admin/toast";
import { bulkProductAction } from "@/lib/admin/product-actions";
import { formatMoney } from "@/lib/pricing/money";

export interface ProductRow {
  id: string; name: string; variants: number; stock: number; fromMinor: number; currency: string; status: "draft" | "published";
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const columns: Column<ProductRow>[] = [
    { key: "name", header: "Name", sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium text-accent">{r.name}</span> },
    { key: "variants", header: "Variants", align: "right", sortable: true, sortValue: (r) => r.variants, cell: (r) => <span className="text-ink-soft">{r.variants}</span> },
    { key: "stock", header: "Stock", align: "right", sortable: true, sortValue: (r) => r.stock, cell: (r) => <span className={r.stock <= 5 ? "font-medium text-gold" : "text-ink-soft"}>{r.stock}</span> },
    { key: "from", header: "From", align: "right", sortable: true, sortValue: (r) => r.fromMinor, cell: (r) => r.fromMinor ? formatMoney(r.fromMinor, r.currency) : "—" },
    { key: "status", header: "Status", sortable: true, sortValue: (r) => r.status, cell: (r) => <Badge tone={r.status === "published" ? "success" : "neutral"}>{r.status}</Badge> },
  ];

  function runBulk(ids: string[], action: "publish" | "draft" | "delete", clear: () => void) {
    start(async () => {
      const res = await bulkProductAction(ids, action);
      if (res.ok) { toast(`${ids.length} product${ids.length === 1 ? "" : "s"} ${action === "delete" ? "deleted" : action === "publish" ? "published" : "set to draft"}`); clear(); router.refresh(); }
      else toast(res.error ?? "Bulk action failed", "error");
    });
  }

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/admin/products/${r.id}`} initialSort={{ key: "name", dir: "asc" }}
      selectable
      renderBulkBar={(ids, clear) => (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk(ids, "publish", clear)}>Publish</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk(ids, "draft", clear)}>Draft</Button>
          <Button size="sm" variant="accent" disabled={pending} onClick={() => runBulk(ids, "delete", clear)}>Delete</Button>
        </>
      )}
      empty={<EmptyState title="No products yet" hint="Create your first product to start selling." />}
    />
  );
}
