"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { Category } from "@/lib/types";

const SORTS = [
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["name", "Name A–Z"],
] as const;

export function CatalogFilters({ brands, categories, hideCategory }: { brands: string[]; categories: Category[]; hideCategory?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const selectedBrands = (params.get("brands") ?? "").split(",").filter(Boolean);
  function toggleBrand(b: string) {
    const set = new Set(selectedBrands);
    if (set.has(b)) set.delete(b); else set.add(b);
    setParam("brands", Array.from(set).join(","));
  }

  return (
    <aside className="space-y-7 text-sm">
      <div>
        <label className="mb-2 block font-medium text-ink">Sort</label>
        <select
          value={params.get("sort") ?? "newest"} onChange={(e) => setParam("sort", e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30"
        >
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!hideCategory && categories.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-ink">Category</p>
          <div className="space-y-1">
            {categories.filter((c) => !c.parent_id).map((c) => (
              <button key={c.id} onClick={() => setParam("category", params.get("category") === c.slug ? null : c.slug)}
                className={`block rounded-lg px-2 py-1 text-left ${params.get("category") === c.slug ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:text-ink"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-medium text-ink">Age group</p>
        <div className="flex gap-2">
          {["kids", "adults"].map((a) => (
            <button key={a} onClick={() => setParam("age", params.get("age") === a ? null : a)}
              className={`rounded-full border px-3 py-1 capitalize ${params.get("age") === a ? "border-brand bg-brand text-paper" : "border-line text-ink-soft hover:border-ink"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-ink">Brand</p>
          <div className="space-y-1.5">
            {brands.map((b) => (
              <label key={b} className="flex items-center gap-2 text-ink-soft">
                <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)} className="accent-brand" />
                {b}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-medium text-ink">Price (LKR)</p>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" defaultValue={params.get("min") ?? ""} onBlur={(e) => setParam("min", e.target.value ? String(Number(e.target.value) * 100) : null)} className="w-full rounded-lg border border-line px-2 py-1.5 outline-none" />
          <span className="text-ink-soft">–</span>
          <input type="number" placeholder="Max" defaultValue={params.get("max") ?? ""} onBlur={(e) => setParam("max", e.target.value ? String(Number(e.target.value) * 100) : null)} className="w-full rounded-lg border border-line px-2 py-1.5 outline-none" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-ink-soft">
        <input type="checkbox" checked={params.get("inStock") === "1"} onChange={(e) => setParam("inStock", e.target.checked ? "1" : null)} className="accent-brand" />
        In stock only
      </label>
    </aside>
  );
}
