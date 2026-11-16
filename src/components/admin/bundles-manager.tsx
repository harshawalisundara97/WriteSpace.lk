"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { saveBundle, deleteBundle, setBundleStatus } from "@/lib/admin/bundle-actions";
import { draftPricing, parsePriceMinor } from "@/lib/admin/bundle-builder";
import { ProductSearchPicker } from "@/components/admin/product-search-picker";
import type { AgeGroup, BundleWithItems, ProductStatus, ProductWithVariants } from "@/lib/types";

type ItemDraft = { product_id: string; variant_id: string; quantity: string };
type BundleDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  age_group: AgeGroup;
  grade_label: string;
  image_url: string;
  price: string; // curated price in LKR (major units); blank = sum of items
  is_featured: boolean;
  position: string;
  status: ProductStatus;
  items: ItemDraft[];
};

const emptyBundle: BundleDraft = {
  name: "", slug: "", description: "", age_group: "all", grade_label: "", image_url: "",
  price: "", is_featured: false, position: "0", status: "published", items: [],
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fmt = (minor: number, currency = "LKR") => `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function variantPrice(product: ProductWithVariants | undefined, variantId: string): number {
  if (!product) return 0;
  const v = variantId ? product.product_variants.find((x) => x.id === variantId) : product.product_variants[0];
  return v?.price_minor ?? 0;
}

export function BundlesManager({ bundles, products }: { bundles: BundleWithItems[]; products: ProductWithVariants[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<BundleDraft | null>(null);

  const productById = (id: string) => products.find((p) => p.id === id);

  function openNew() { setDraft({ ...emptyBundle, items: [] }); }
  function openEdit(b: BundleWithItems) {
    setDraft({
      id: b.id, name: b.name, slug: b.slug, description: b.description ?? "",
      age_group: b.age_group, grade_label: b.grade_label ?? "", image_url: b.image_url ?? "",
      price: b.bundle_price_minor != null ? String(b.bundle_price_minor / 100) : "",
      is_featured: b.is_featured, position: String(b.position), status: b.status,
      items: b.items.map((it) => ({ product_id: it.product.id, variant_id: it.variant?.id ?? "", quantity: String(it.quantity) })),
    });
  }

  function save() {
    if (!draft) return;
    const items = draft.items
      .filter((i) => i.product_id)
      .map((i, idx) => ({ product_id: i.product_id, variant_id: i.variant_id || null, quantity: Number(i.quantity || 1), position: idx }));
    const parsedPrice = parsePriceMinor(draft.price);
    if (Number.isNaN(parsedPrice)) { toast("Curated price must be a non-negative number", "error"); return; }
    start(async () => {
      const res = await saveBundle({
        id: draft.id,
        name: draft.name,
        slug: draft.slug || slugify(draft.name),
        description: draft.description,
        age_group: draft.age_group,
        grade_label: draft.grade_label,
        image_url: draft.image_url,
        bundle_price_minor: parsedPrice,
        is_featured: draft.is_featured,
        position: Number(draft.position || 0),
        status: draft.status,
        items,
      });
      if (res.ok) { setDraft(null); router.refresh(); toast("Bundle saved"); }
      else toast(res.error ?? "Failed", "error");
    });
  }

  function del(id: string) {
    start(async () => {
      const r = await deleteBundle(id);
      r.ok ? (router.refresh(), toast("Bundle deleted")) : toast(r.error ?? "Failed", "error");
    });
  }
  function toggleStatus(b: BundleWithItems) {
    const next: ProductStatus = b.status === "published" ? "draft" : "published";
    start(async () => {
      const r = await setBundleStatus(b.id, next);
      r.ok ? (router.refresh(), toast(next === "published" ? "Published" : "Moved to draft")) : toast(r.error ?? "Failed", "error");
    });
  }

  // ---- item builder helpers (operate on the open draft) ----
  function addItem() {
    if (!draft) return;
    const used = new Set(draft.items.map((i) => i.product_id));
    const next = products.find((p) => !used.has(p.id));
    setDraft({ ...draft, items: [...draft.items, { product_id: next?.id ?? "", variant_id: "", quantity: "1" }] });
  }
  function setItem(idx: number, patch: Partial<ItemDraft>) {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  }
  function removeItem(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  }

  const pricing = draft ? draftPricing(draft.items, draft.price, productById) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Bundles ({bundles.length})</h2>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New bundle</Button>
      </div>

      {bundles.length === 0 ? (
        <EmptyState title="No bundles yet" hint="Create a curated set of products to sell together." action={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New bundle</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft">
              <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Grade / label</th><th className="px-4 py-2">Items</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Featured</th><th /></tr>
            </thead>
            <tbody>
              {bundles.map((b) => {
                const itemsTotal = b.items.reduce((s, it) => s + variantPrice(it.product, it.variant?.id ?? "") * it.quantity, 0);
                const price = b.bundle_price_minor ?? itemsTotal;
                return (
                  <tr key={b.id} className="border-t border-line">
                    <td className="px-4 py-2"><div className="font-medium">{b.name}</div><div className="font-mono text-xs text-ink-soft">{b.slug}</div></td>
                    <td className="px-4 py-2 text-ink-soft">{b.grade_label || "—"}</td>
                    <td className="px-4 py-2 text-ink-soft">{b.items.length}</td>
                    <td className="px-4 py-2">{fmt(price)}{b.bundle_price_minor != null && price < itemsTotal && <span className="ml-1 text-xs text-mint">save {fmt(itemsTotal - price)}</span>}</td>
                    <td className="px-4 py-2"><Badge tone={b.status === "published" ? "success" : "neutral"}>{b.status}</Badge></td>
                    <td className="px-4 py-2">{b.is_featured ? <Badge tone="info">Yes</Badge> : <span className="text-ink-soft">—</span>}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button className="mr-3 text-ink-soft hover:text-ink" title={b.status === "published" ? "Move to draft" : "Publish"} onClick={() => toggleStatus(b)}>{b.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button className="mr-3 text-ink-soft hover:text-ink" title="Edit" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></button>
                      <button className="text-ink-soft hover:text-accent" title="Delete" onClick={() => del(b.id)}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <div className="rounded-2xl border border-line p-5">
          <h3 className="mb-4 font-display text-lg font-semibold">{draft.id ? "Edit bundle" : "New bundle"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Inp label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v, slug: draft.id ? draft.slug : slugify(v) })} />
            <Inp label="Slug" value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} />
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm text-ink-soft">Description</span>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="w-full rounded-xl border border-line bg-paper px-3 py-2" />
            </label>
            <label className="block"><span className="mb-1 block text-sm text-ink-soft">Age group</span>
              <select value={draft.age_group} onChange={(e) => setDraft({ ...draft, age_group: e.target.value as AgeGroup })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                <option value="all">All</option><option value="kids">Kids</option><option value="adults">Adults</option>
              </select>
            </label>
            <Inp label="Grade / label (optional)" value={draft.grade_label} onChange={(v) => setDraft({ ...draft, grade_label: v })} />
            <Inp label="Image URL (optional)" value={draft.image_url} onChange={(v) => setDraft({ ...draft, image_url: v })} />
            <Inp label="Curated price LKR (blank = sum of items)" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} type="number" />
            <Inp label="Position" value={draft.position} onChange={(v) => setDraft({ ...draft, position: v })} type="number" />
            <label className="block"><span className="mb-1 block text-sm text-ink-soft">Status</span>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductStatus })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                <option value="published">Published</option><option value="draft">Draft</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} className="accent-brand" /> Featured on home</label>
          </div>

          {/* Item builder */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Products in this bundle</span>
              <Button size="sm" variant="ghost" onClick={addItem} disabled={draft.items.length >= products.length}><Plus className="h-4 w-4" /> Add product</Button>
            </div>
            {draft.items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-3 text-sm text-ink-soft">Add at least one product.</p>}
            <div className="space-y-2">
              {draft.items.map((it, idx) => {
                const p = productById(it.product_id);
                const line = pricing?.lines[idx];
                const others = new Set(draft.items.map((x) => x.product_id).filter((id) => id && id !== it.product_id));
                return (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-end gap-2">
                    <div className="block"><span className="mb-1 block text-xs text-ink-soft">Product</span>
                      <ProductSearchPicker products={products} value={it.product_id} excludeIds={others} onChange={(id) => setItem(idx, { product_id: id, variant_id: "" })} />
                    </div>
                    <label className="block"><span className="mb-1 block text-xs text-ink-soft">Variant</span>
                      <select value={it.variant_id} onChange={(e) => setItem(idx, { variant_id: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm" disabled={!p}>
                        <option value="">First / default</option>
                        {p?.product_variants.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.sku} — {fmt(v.price_minor)}</option>)}
                      </select>
                    </label>
                    <label className="block w-20"><span className="mb-1 block text-xs text-ink-soft">Qty</span>
                      <input type="number" min={1} value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} className="h-10 w-full rounded-xl border border-line bg-paper px-2 text-sm" />
                    </label>
                    <div className="w-32 pb-2 text-right text-sm tabular-nums" title={line ? `${fmt(line.unitMinor)} × ${line.quantity}` : undefined}>
                      {line && p ? fmt(line.lineMinor, pricing?.currency) : <span className="text-ink-soft">—</span>}
                    </div>
                    <button className="mb-1 p-2 text-ink-soft hover:text-accent" title="Remove" onClick={() => removeItem(idx)}><X className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
            {pricing && (
              <div className="mt-4 rounded-xl bg-paper-2 px-4 py-3 text-sm" aria-live="polite">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">Storefront preview</div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-display text-lg font-semibold">{fmt(pricing.priceMinor, pricing.currency)}</span>
                  {pricing.savingsMinor > 0 && (
                    <>
                      <span className="text-ink-soft line-through">{fmt(pricing.itemsTotalMinor, pricing.currency)}</span>
                      <span className="font-medium text-mint">Save {fmt(pricing.savingsMinor, pricing.currency)} ({pricing.savingsPct}%)</span>
                    </>
                  )}
                  <span className="text-ink-soft">{pricing.curated ? "curated price" : "sum of items"} · {pricing.lines.reduce((s, l) => s + l.quantity, 0)} units</span>
                </div>
                {pricing.priceAboveItems && (
                  <p className="mt-2 flex items-center gap-1 text-accent"><AlertTriangle className="h-4 w-4" /> Curated price is above the items total ({fmt(pricing.itemsTotalMinor, pricing.currency)}), so customers pay more than buying separately.</p>
                )}
                {pricing.invalidPrice && (
                  <p className="mt-2 flex items-center gap-1 text-accent"><AlertTriangle className="h-4 w-4" /> Curated price must be a non-negative number.</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button size="sm" onClick={save} disabled={pending}>Save bundle</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Inp({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3" />
    </label>
  );
}
