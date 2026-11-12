"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/admin/ui";
import { useToast } from "@/components/admin/toast";
import { saveCategory, deleteCategory, saveCollection, deleteCollection } from "@/lib/admin/category-actions";
import type { Category, Collection } from "@/lib/types";

type CatDraft = { id?: string; name: string; slug: string; description: string; parent_id: string; age_group: Category["age_group"]; position: string; is_featured: boolean };
const emptyCat: CatDraft = { name: "", slug: "", description: "", parent_id: "", age_group: "all", position: "0", is_featured: false };
type ColDraft = { id?: string; name: string; slug: string; description: string; position: string; is_featured: boolean };
const emptyCol: ColDraft = { name: "", slug: "", description: "", position: "0", is_featured: false };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CategoriesManager({ categories, collections }: { categories: Category[]; collections: Collection[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<CatDraft | null>(null);
  const [col, setCol] = useState<ColDraft | null>(null);

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const ordered = topLevel.flatMap((c) => [{ c, child: false }, ...childrenOf(c.id).map((cc) => ({ c: cc, child: true }))]);

  function saveCat() {
    if (!cat) return;
    start(async () => {
      const res = await saveCategory({ id: cat.id, name: cat.name, slug: cat.slug || slugify(cat.name), description: cat.description, parent_id: cat.parent_id || null, age_group: cat.age_group, position: Number(cat.position || 0), is_featured: cat.is_featured });
      if (res.ok) { setCat(null); router.refresh(); toast("Category saved"); } else toast(res.error ?? "Failed", "error");
    });
  }
  function saveCol() {
    if (!col) return;
    start(async () => {
      const res = await saveCollection({ id: col.id, name: col.name, slug: col.slug || slugify(col.name), description: col.description, position: Number(col.position || 0), is_featured: col.is_featured });
      if (res.ok) { setCol(null); router.refresh(); toast("Collection saved"); } else toast(res.error ?? "Failed", "error");
    });
  }
  function delCat(id: string) { start(async () => { const r = await deleteCategory(id); r.ok ? (router.refresh(), toast("Category deleted")) : toast(r.error ?? "Failed", "error"); }); }
  function delCol(id: string) { start(async () => { const r = await deleteCollection(id); r.ok ? (router.refresh(), toast("Collection deleted")) : toast(r.error ?? "Failed", "error"); }); }

  return (
    <div className="space-y-10">
      {/* Categories */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Categories</h2>
          <Button size="sm" onClick={() => setCat({ ...emptyCat })}><Plus className="h-4 w-4" /> New category</Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Slug</th><th className="px-4 py-2">Age</th><th className="px-4 py-2">Featured</th><th /></tr></thead>
            <tbody>
              {ordered.map(({ c, child }) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-2"><span className={child ? "flex items-center gap-1.5 pl-5 text-ink-soft" : "font-medium"}>{child && <CornerDownRight className="h-3.5 w-3.5" />}{c.name}</span></td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-soft">{c.slug}</td>
                  <td className="px-4 py-2 capitalize text-ink-soft">{c.age_group}</td>
                  <td className="px-4 py-2">{c.is_featured ? <Badge tone="success">Yes</Badge> : <span className="text-ink-soft">—</span>}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-3 text-ink-soft hover:text-ink" onClick={() => setCat({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", parent_id: c.parent_id ?? "", age_group: c.age_group, position: String(c.position), is_featured: c.is_featured })}><Pencil className="h-4 w-4" /></button>
                    <button className="text-ink-soft hover:text-accent" onClick={() => delCat(c.id)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cat && (
          <div className="mt-4 rounded-2xl border border-line p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Inp label="Name" value={cat.name} onChange={(v) => setCat({ ...cat, name: v, slug: cat.id ? cat.slug : slugify(v) })} />
              <Inp label="Slug" value={cat.slug} onChange={(v) => setCat({ ...cat, slug: v })} />
              <label className="block"><span className="mb-1 block text-sm text-ink-soft">Parent (for nesting)</span>
                <select value={cat.parent_id} onChange={(e) => setCat({ ...cat, parent_id: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                  <option value="">— Top level —</option>
                  {topLevel.filter((t) => t.id !== cat.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label className="block"><span className="mb-1 block text-sm text-ink-soft">Age group</span>
                <select value={cat.age_group} onChange={(e) => setCat({ ...cat, age_group: e.target.value as Category["age_group"] })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                  <option value="all">All</option><option value="kids">Kids</option><option value="adults">Adults</option>
                </select>
              </label>
              <Inp label="Position" value={cat.position} onChange={(v) => setCat({ ...cat, position: v })} type="number" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cat.is_featured} onChange={(e) => setCat({ ...cat, is_featured: e.target.checked })} className="accent-brand" /> Featured on home</label>
            </div>
            <div className="mt-4 flex gap-2"><Button size="sm" onClick={saveCat} disabled={pending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setCat(null)}>Cancel</Button></div>
          </div>
        )}
      </section>

      {/* Collections */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Collections</h2>
          <Button size="sm" onClick={() => setCol({ ...emptyCol })}><Plus className="h-4 w-4" /> New collection</Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Slug</th><th className="px-4 py-2">Featured</th><th /></tr></thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-soft">{c.slug}</td>
                  <td className="px-4 py-2">{c.is_featured ? <Badge tone="success">Yes</Badge> : <span className="text-ink-soft">—</span>}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-3 text-ink-soft hover:text-ink" onClick={() => setCol({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", position: String(c.position), is_featured: c.is_featured })}><Pencil className="h-4 w-4" /></button>
                    <button className="text-ink-soft hover:text-accent" onClick={() => delCol(c.id)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {col && (
          <div className="mt-4 rounded-2xl border border-line p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Inp label="Name" value={col.name} onChange={(v) => setCol({ ...col, name: v, slug: col.id ? col.slug : slugify(v) })} />
              <Inp label="Slug" value={col.slug} onChange={(v) => setCol({ ...col, slug: v })} />
              <Inp label="Position" value={col.position} onChange={(v) => setCol({ ...col, position: v })} type="number" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={col.is_featured} onChange={(e) => setCol({ ...col, is_featured: e.target.checked })} className="accent-brand" /> Featured on home</label>
            </div>
            <div className="mt-4 flex gap-2"><Button size="sm" onClick={saveCol} disabled={pending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setCol(null)}>Cancel</Button></div>
          </div>
        )}
      </section>
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
