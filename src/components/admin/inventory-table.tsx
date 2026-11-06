"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { adjustInventory } from "@/lib/admin/inventory-actions";
import type { InventoryRow } from "@/lib/admin/inventory";

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (rows.length === 0) return <EmptyState title="No inventory yet" hint="Add products with variants to track stock." />;

  function save(r: InventoryRow) {
    const next = Number(edits[r.variant_id] ?? r.on_hand);
    if (next === r.on_hand) { toast("No change", "info"); return; }
    setSavingId(r.variant_id);
    start(async () => {
      const res = await adjustInventory(r.variant_id, next, "Manual adjustment");
      setSavingId(null);
      if (res.ok) { toast("Stock updated"); router.refresh(); }
      else toast(res.error ?? "Could not update", "error");
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 text-right font-medium">Available</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 text-right font-medium">On hand</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const available = r.on_hand - r.reserved;
              const low = available <= r.low_stock_threshold;
              return (
                <tr key={r.variant_id} className="border-t border-line">
                  <td className="px-4 py-3">{r.product_name}{r.variant_name && <span className="text-ink-soft"> · {r.variant_name}</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{r.sku}</td>
                  <td className="px-4 py-3 text-right">{low ? <Badge tone="warning">{available}</Badge> : available}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{r.reserved}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min={0} value={edits[r.variant_id] ?? String(r.on_hand)}
                      onChange={(e) => setEdits((s) => ({ ...s, [r.variant_id]: e.target.value }))}
                      className="h-9 w-20 rounded-lg border border-line bg-paper px-2 text-right outline-none focus:ring-2 focus:ring-brand/30" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={pending && savingId === r.variant_id} onClick={() => save(r)}>
                      {pending && savingId === r.variant_id ? "…" : "Save"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
