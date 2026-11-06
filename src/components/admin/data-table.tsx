"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  selectable?: boolean;
  renderBulkBar?: (ids: string[], clear: () => void) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, rowHref, empty, initialSort, selectable, renderBulkBar }: Props<T>) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }
  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  const allIds = sorted.map(rowKey);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  const clear = () => setSelected(new Set());

  const alignCls = (a?: "left" | "right" | "center") => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {selectable && renderBulkBar && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">{renderBulkBar(Array.from(selected), clear)}</div>
          <button onClick={clear} className="ml-auto text-ink-soft hover:text-ink">Clear</button>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft">
              <tr>
                {selectable && <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-brand" aria-label="Select all" /></th>}
                {columns.map((c) => (
                  <th key={c.key} className={cn("px-4 py-3 font-medium whitespace-nowrap", alignCls(c.align))}>
                    {c.sortable ? (
                      <button onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1 hover:text-ink", c.align === "right" && "flex-row-reverse")}>
                        {c.header}
                        {sort?.key === c.key ? (sort.dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                    ) : c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const id = rowKey(row);
                const href = rowHref?.(row);
                return (
                  <tr key={id} onClick={href ? () => router.push(href) : undefined} className={cn("border-t border-line", href && "cursor-pointer hover:bg-paper-2/50", selected.has(id) && "bg-brand/5")}>
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} className="accent-brand" aria-label="Select row" />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle", alignCls(c.align), c.className)}>{c.cell(row)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
