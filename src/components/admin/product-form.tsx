"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveProduct, uploadProductImage } from "@/lib/admin/product-actions";
import { useToast } from "@/components/admin/toast";
import { toMinor, toMajor } from "@/lib/pricing/money";
import type { Category, ProductWithVariants } from "@/lib/types";

type VariantRow = {
  id?: string; sku: string; name: string; price: string; compareAt: string; onHand: string; lowStock: string; is_active: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductForm({ product, categories }: { product: ProductWithVariants | null; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [ageGroup, setAgeGroup] = useState(product?.age_group ?? "all");
  const [status, setStatus] = useState(product?.status ?? "draft");
  const [images, setImages] = useState<{ url: string; alt?: string }[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);

  const [variants, setVariants] = useState<VariantRow[]>(
    product?.product_variants?.length
      ? product.product_variants.map((v) => ({
          id: v.id, sku: v.sku, name: v.name ?? "",
          price: String(toMajor(v.price_minor)),
          compareAt: v.compare_at_minor != null ? String(toMajor(v.compare_at_minor)) : "",
          onHand: String(v.inventory?.on_hand ?? 0),
          lowStock: String(v.inventory?.low_stock_threshold ?? 5),
          is_active: v.is_active,
        }))
      : [{ sku: "", name: "", price: "", compareAt: "", onHand: "0", lowStock: "5", is_active: true }],
  );

  function onName(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }
  function setV(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadProductImage(fd);
    setUploading(false);
    if (res.ok && res.url) setImages((imgs) => [...imgs, { url: res.url!, alt: name }]);
    else { setError(res.error ?? "Upload failed"); toast(res.error ?? "Upload failed", "error"); }
  }

  function submit() {
    setError(null);
    const payload = {
      id: product?.id,
      name, slug, description, brand,
      category_id: categoryId || null,
      age_group: ageGroup, status, images,
      seo_title: "", seo_description: "",
      variants: variants.map((v) => ({
        id: v.id, sku: v.sku, name: v.name,
        price_minor: toMinor(Number(v.price || 0)),
        compare_at_minor: v.compareAt ? toMinor(Number(v.compareAt)) : null,
        on_hand: Number(v.onHand || 0),
        low_stock_threshold: Number(v.lowStock || 5),
        is_active: v.is_active,
      })),
    };
    start(async () => {
      const res = await saveProduct(payload);
      if (res.ok) { toast("Product saved"); router.push("/admin/products"); }
      else { setError(res.error ?? "Save failed"); toast(res.error ?? "Save failed", "error"); }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={name} onChange={onName} />
        <Field label="Slug" value={slug} onChange={(v) => { setSlug(v); setSlugTouched(true); }} />
        <Field label="Brand" value={brand} onChange={setBrand} />
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Category</span>
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Age group</span>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as typeof ageGroup)} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
            <option value="all">All</option><option value="kids">Kids</option><option value="adults">Adults</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
            <option value="draft">Draft</option><option value="published">Published</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-line bg-paper p-3" />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Images</p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-line bg-cover bg-center" style={{ backgroundImage: `url(${img.url})` }}>
              <button onClick={() => setImages((a) => a.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-paper"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-ink-soft hover:border-ink">
            {uploading ? "…" : <Upload className="h-5 w-5" />}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Variants & stock</p>
          <Button size="sm" variant="outline" onClick={() => setVariants((r) => [...r, { sku: "", name: "", price: "", compareAt: "", onHand: "0", lowStock: "5", is_active: true }])}>
            <Plus className="h-4 w-4" /> Add variant
          </Button>
        </div>
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-6">
              <input placeholder="SKU" value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} className="h-9 rounded-lg border border-line px-2 text-sm" />
              <input placeholder="Option name" value={v.name} onChange={(e) => setV(i, { name: e.target.value })} className="h-9 rounded-lg border border-line px-2 text-sm" />
              <input placeholder="Price" type="number" value={v.price} onChange={(e) => setV(i, { price: e.target.value })} className="h-9 rounded-lg border border-line px-2 text-sm" />
              <input placeholder="Compare at" type="number" value={v.compareAt} onChange={(e) => setV(i, { compareAt: e.target.value })} className="h-9 rounded-lg border border-line px-2 text-sm" />
              <input placeholder="Stock" type="number" value={v.onHand} onChange={(e) => setV(i, { onHand: e.target.value })} className="h-9 rounded-lg border border-line px-2 text-sm" />
              <div className="flex items-center gap-2">
                <input placeholder="Low" type="number" value={v.lowStock} onChange={(e) => setV(i, { lowStock: e.target.value })} className="h-9 w-full rounded-lg border border-line px-2 text-sm" />
                {variants.length > 1 && <button onClick={() => setVariants((r) => r.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-ink-soft" /></button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save product"}</Button>
        <Button variant="ghost" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3" />
    </label>
  );
}
