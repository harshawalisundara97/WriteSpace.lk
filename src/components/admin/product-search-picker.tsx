"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchProducts } from "@/lib/admin/bundle-builder";
import type { ProductWithVariants } from "@/lib/types";

/**
 * Searchable product combobox. Type to filter by name / brand / SKU; arrow keys
 * + Enter to pick, Escape to close. Products in `excludeIds` are hidden.
 */
export function ProductSearchPicker({
  products, value, onChange, excludeIds,
}: {
  products: ProductWithVariants[];
  value: string;
  onChange: (productId: string) => void;
  excludeIds: ReadonlySet<string>;
}) {
  const listId = useId();
  const selected = products.find((p) => p.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchProducts(products, query, excludeIds), [products, query, excludeIds]);

  function pick(p: ProductWithVariants) {
    onChange(p.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { if (open && results[active]) { e.preventDefault(); pick(results[active]); } }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      <input
        ref={inputRef}
        role="combobox"
        aria-label="Product"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        placeholder={selected ? selected.name : "Search products…"}
        value={open ? query : selected?.name ?? ""}
        onFocus={() => { setOpen(true); setActive(0); }}
        onBlur={() => setTimeout(() => { setOpen(false); setQuery(""); }, 120)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border border-line bg-paper pl-8 pr-2 text-sm"
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-paper py-1 text-sm shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-ink-soft">No matching products</li>}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={p.id === value}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 ${i === active ? "bg-paper-2" : ""}`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-ink-soft">
                {[p.brand, p.product_variants[0]?.sku, `${p.product_variants.length} variant${p.product_variants.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                {p.status === "draft" && " · draft"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
