"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/lib/types";
import type { Facets } from "@/lib/catalog/queries";
import { SPEC_FIELDS, specFilterLabel } from "@/lib/catalog/specs";
import { formatMoney } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

const SORTS = [
  ["newest", "Newest"], ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"], ["name", "Name A–Z"],
] as const;

export function CatalogFilters({ facets, categories, hideCategory }: { facets: Facets; categories: Category[]; hideCategory?: boolean }) {
  const [drawer, setDrawer] = useState(false);
  const params = useSearchParams();
  const activeCount =
    (params.get("category") && !hideCategory ? 1 : 0) + (params.get("age") ? 1 : 0) +
    (params.get("brands")?.split(",").filter(Boolean).length ?? 0) +
    (params.get("colours")?.split(",").filter(Boolean).length ?? 0) +
    (params.get("min") || params.get("max") ? 1 : 0) + (params.get("inStock") === "1" ? 1 : 0) +
    SPEC_FIELDS.reduce((n, f) => n + (params.get(f.key)?.split(",").filter(Boolean).length ?? 0), 0);

  return (
    <>
      {/* Mobile trigger */}
      <button onClick={() => setDrawer(true)} className="mb-4 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-xs text-paper">{activeCount}</span>}
      </button>

      {/* Desktop inline */}
      <div className="hidden lg:block"><Controls facets={facets} categories={categories} hideCategory={hideCategory} /></div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)}>
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-paper" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-lg font-semibold">Filters</h2>
                <button aria-label="Close" onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-2"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5"><Controls facets={facets} categories={categories} hideCategory={hideCategory} /></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Controls({ facets, categories, hideCategory }: { facets: Facets; categories: Category[]; hideCategory?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "") next.delete(key); else next.set(key, value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const selectedBrands = (params.get("brands") ?? "").split(",").filter(Boolean);
  const selectedColours = (params.get("colours") ?? "").split(",").filter(Boolean);
  const curMin = params.get("min"), curMax = params.get("max");

  function toggle(key: string, value: string, cur: string[]) {
    const set = new Set(cur);
    if (set.has(value)) set.delete(value); else set.add(value);
    setParam(key, Array.from(set).join(","));
  }

  const minBound = Math.floor(facets.priceMin / 100);
  const maxBound = Math.ceil(facets.priceMax / 100);
  const [lo, setLo] = useState(curMin ? Number(curMin) / 100 : minBound);
  const [hi, setHi] = useState(curMax ? Number(curMax) / 100 : maxBound);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (!hideCategory && params.get("category")) { const c = categories.find((x) => x.slug === params.get("category")); chips.push({ label: c?.name ?? "Category", onRemove: () => setParam("category", null) }); }
  if (params.get("age")) chips.push({ label: params.get("age")!, onRemove: () => setParam("age", null) });
  for (const b of selectedBrands) chips.push({ label: b, onRemove: () => toggle("brands", b, selectedBrands) });
  for (const c of selectedColours) chips.push({ label: c, onRemove: () => toggle("colours", c, selectedColours) });
  if (curMin || curMax) chips.push({ label: `${formatMoney(Number(curMin ?? facets.priceMin))}–${formatMoney(Number(curMax ?? facets.priceMax))}`, onRemove: () => { setParam("min", null); } });
  if (params.get("inStock") === "1") chips.push({ label: "In stock", onRemove: () => setParam("inStock", null) });
  for (const f of SPEC_FIELDS) {
    const sel = (params.get(f.key) ?? "").split(",").filter(Boolean);
    for (const v of sel) chips.push({ label: specFilterLabel(f.key, v), onRemove: () => toggle(f.key, v, sel) });
  }

  function clearAll() { router.push(pathname, { scroll: false }); }

  return (
    <aside className="space-y-7 text-sm">
      {chips.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-ink">Active</span>
            <button onClick={clearAll} className="text-xs text-accent hover:underline">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <button key={i} onClick={c.onRemove} className="flex items-center gap-1 rounded-full bg-paper-2 px-3 py-1 text-xs capitalize text-ink hover:bg-line">
                {c.label} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block font-medium text-ink">Sort</label>
        <select value={params.get("sort") ?? "newest"} onChange={(e) => setParam("sort", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!hideCategory && categories.filter((c) => !c.parent_id).length > 0 && (
        <div>
          <p className="mb-2 font-medium text-ink">Category</p>
          <div className="space-y-1">
            {categories.filter((c) => !c.parent_id).map((c) => (
              <button key={c.id} onClick={() => setParam("category", params.get("category") === c.slug ? null : c.slug)}
                className={cn("block rounded-lg px-2 py-1 text-left", params.get("category") === c.slug ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:text-ink")}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {maxBound > minBound && (
        <div>
          <p className="mb-3 font-medium text-ink">Price</p>
          <div className="relative h-6">
            <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-paper-2" />
            <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand" style={{ left: `${((lo - minBound) / (maxBound - minBound)) * 100}%`, right: `${100 - ((hi - minBound) / (maxBound - minBound)) * 100}%` }} />
            <input type="range" min={minBound} max={maxBound} value={lo} onChange={(e) => setLo(Math.min(Number(e.target.value), hi))} onPointerUp={() => setParam("min", String(lo * 100))}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand" />
            <input type="range" min={minBound} max={maxBound} value={hi} onChange={(e) => setHi(Math.max(Number(e.target.value), lo))} onPointerUp={() => setParam("max", String(hi * 100))}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink-soft"><span>{formatMoney(lo * 100)}</span><span>{formatMoney(hi * 100)}</span></div>
        </div>
      )}

      {facets.colours.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-ink">Colour</p>
          <div className="flex flex-wrap gap-2">
            {facets.colours.map((c) => {
              const sel = selectedColours.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggle("colours", c.name, selectedColours)} title={`${c.name} (${c.count})`} aria-label={c.name}
                  className={cn("grid h-8 w-8 place-items-center rounded-full border-2", sel ? "border-brand" : "border-line hover:border-ink/40")}>
                  <span className="h-5 w-5 rounded-full" style={{ background: c.hex }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-medium text-ink">Age group</p>
        <div className="flex gap-2">
          {["kids", "adults"].map((a) => (
            <button key={a} onClick={() => setParam("age", params.get("age") === a ? null : a)}
              className={cn("rounded-full border px-3 py-1 capitalize", params.get("age") === a ? "border-brand bg-brand text-paper" : "border-line text-ink-soft hover:border-ink")}>{a}</button>
          ))}
        </div>
      </div>

      {facets.brands.length > 0 && (
        <div>
          <p className="mb-2 font-medium text-ink">Brand</p>
          <div className="space-y-1.5">
            {facets.brands.map((b) => (
              <label key={b.name} className="flex items-center justify-between text-ink-soft">
                <span className="flex items-center gap-2"><input type="checkbox" checked={selectedBrands.includes(b.name)} onChange={() => toggle("brands", b.name, selectedBrands)} className="accent-brand" />{b.name}</span>
                <span className="text-xs">{b.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {facets.specs.map((f) => (
        <div key={f.key}>
          <p className="mb-2 font-medium text-ink">{f.label}</p>
          <div className="space-y-1.5">
            {f.values.map((val) => {
              const sel = (params.get(f.key) ?? "").split(",").filter(Boolean);
              return (
                <label key={val.value} className="flex items-center justify-between text-ink-soft">
                  <span className="flex items-center gap-2"><input type="checkbox" checked={sel.includes(val.value)} onChange={() => toggle(f.key, val.value, sel)} className="accent-brand" />{val.label}</span>
                  <span className="text-xs">{val.count}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <label className="flex items-center justify-between text-ink-soft">
        <span className="flex items-center gap-2"><input type="checkbox" checked={params.get("inStock") === "1"} onChange={(e) => setParam("inStock", e.target.checked ? "1" : null)} className="accent-brand" />In stock only</span>
        <span className="text-xs">{facets.inStock}</span>
      </label>
    </aside>
  );
}
