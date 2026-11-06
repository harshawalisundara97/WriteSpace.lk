"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePromotion, deletePromotion, saveBanner, deleteBanner } from "@/lib/admin/promo-actions";
import { useToast } from "@/components/admin/toast";
import { toMinor, toMajor, formatMoney } from "@/lib/pricing/money";
import type { Promotion, Banner } from "@/lib/types";

type PromoDraft = {
  id?: string; name: string; type: Promotion["type"]; value: string; code: string;
  min: string; stackable: boolean; priority: string; is_active: boolean; starts_at: string; ends_at: string;
};
const emptyPromo: PromoDraft = { name: "", type: "percentage", value: "", code: "", min: "", stackable: false, priority: "0", is_active: true, starts_at: "", ends_at: "" };

type BannerDraft = { id?: string; title: string; image_url: string; link_url: string; placement: Banner["placement"]; position: string; is_active: boolean };
const emptyBanner: BannerDraft = { title: "", image_url: "", link_url: "", placement: "home_hero", position: "0", is_active: true };

export function PromotionsManager({ promotions, banners }: { promotions: Promotion[]; banners: Banner[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [promo, setPromo] = useState<PromoDraft | null>(null);
  const [banner, setBanner] = useState<BannerDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function savePromo() {
    if (!promo) return;
    setError(null);
    start(async () => {
      const res = await savePromotion({
        id: promo.id, name: promo.name, type: promo.type,
        value: promo.type === "fixed" ? toMinor(Number(promo.value || 0)) : Number(promo.value || 0),
        code: promo.code, min_subtotal_minor: toMinor(Number(promo.min || 0)),
        stackable: promo.stackable, priority: Number(promo.priority || 0), is_active: promo.is_active,
        starts_at: promo.starts_at || null, ends_at: promo.ends_at || null,
      });
      if (res.ok) { setPromo(null); router.refresh(); toast("Promotion saved"); } else { setError(res.error ?? "Failed"); toast(res.error ?? "Failed", "error"); }
    });
  }
  function saveBan() {
    if (!banner) return;
    setError(null);
    start(async () => {
      const res = await saveBanner({
        id: banner.id, title: banner.title, image_url: banner.image_url || null, link_url: banner.link_url,
        placement: banner.placement, position: Number(banner.position || 0), is_active: banner.is_active,
      });
      if (res.ok) { setBanner(null); router.refresh(); toast("Banner saved"); } else { setError(res.error ?? "Failed"); toast(res.error ?? "Failed", "error"); }
    });
  }

  return (
    <div className="space-y-10">
      {/* Promotions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Promotions</h2>
          <Button size="sm" onClick={() => setPromo({ ...emptyPromo })}><Plus className="h-4 w-4" /> New promotion</Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Active</th><th /></tr></thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-ink-soft">{p.type === "fixed" ? `${formatMoney(p.value)} off` : p.type === "percentage" ? `${p.value}%` : p.type}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.code ?? "—"}</td>
                  <td className="px-4 py-2">{p.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-3 text-ink-soft hover:text-ink" onClick={() => setPromo({ id: p.id, name: p.name, type: p.type, value: p.type === "fixed" ? String(toMajor(p.value)) : String(p.value), code: p.code ?? "", min: String(toMajor(p.min_subtotal_minor)), stackable: p.stackable, priority: String(p.priority), is_active: p.is_active, starts_at: p.starts_at?.slice(0, 16) ?? "", ends_at: p.ends_at?.slice(0, 16) ?? "" })}><Pencil className="h-4 w-4" /></button>
                    <button className="text-ink-soft hover:text-accent" onClick={() => start(async () => { await deletePromotion(p.id); router.refresh(); toast("Promotion deleted"); })}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {promo && (
          <div className="mt-4 rounded-2xl border border-line p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Inp label="Name" value={promo.name} onChange={(v) => setPromo({ ...promo, name: v })} />
              <label className="block"><span className="mb-1 block text-sm text-ink-soft">Type</span>
                <select value={promo.type} onChange={(e) => setPromo({ ...promo, type: e.target.value as Promotion["type"] })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                  <option value="percentage">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free shipping</option><option value="bxgy">Buy X get Y</option>
                </select>
              </label>
              {promo.type !== "free_shipping" && <Inp label={promo.type === "fixed" ? "Amount (LKR)" : "Value (%)"} value={promo.value} onChange={(v) => setPromo({ ...promo, value: v })} type="number" />}
              <Inp label="Code (blank = automatic)" value={promo.code} onChange={(v) => setPromo({ ...promo, code: v })} />
              <Inp label="Min subtotal (LKR)" value={promo.min} onChange={(v) => setPromo({ ...promo, min: v })} type="number" />
              <Inp label="Priority" value={promo.priority} onChange={(v) => setPromo({ ...promo, priority: v })} type="number" />
              <Inp label="Starts" value={promo.starts_at} onChange={(v) => setPromo({ ...promo, starts_at: v })} type="datetime-local" />
              <Inp label="Ends" value={promo.ends_at} onChange={(v) => setPromo({ ...promo, ends_at: v })} type="datetime-local" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={promo.stackable} onChange={(e) => setPromo({ ...promo, stackable: e.target.checked })} className="accent-brand" /> Stackable</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={promo.is_active} onChange={(e) => setPromo({ ...promo, is_active: e.target.checked })} className="accent-brand" /> Active</label>
            </div>
            <div className="mt-4 flex gap-2"><Button size="sm" onClick={savePromo} disabled={pending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setPromo(null)}>Cancel</Button></div>
          </div>
        )}
      </section>

      {/* Banners */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Banners & ads</h2>
          <Button size="sm" onClick={() => setBanner({ ...emptyBanner })}><Plus className="h-4 w-4" /> New banner</Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-2">Title</th><th className="px-4 py-2">Placement</th><th className="px-4 py-2">Active</th><th /></tr></thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="px-4 py-2">{b.title}</td>
                  <td className="px-4 py-2 text-ink-soft">{b.placement}</td>
                  <td className="px-4 py-2">{(b as Banner & { is_active?: boolean }).is_active === false ? "No" : "Yes"}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="mr-3 text-ink-soft hover:text-ink" onClick={() => setBanner({ id: b.id, title: b.title, image_url: b.image_url ?? "", link_url: b.link_url ?? "", placement: b.placement as Banner["placement"], position: String(b.position), is_active: true })}><Pencil className="h-4 w-4" /></button>
                    <button className="text-ink-soft hover:text-accent" onClick={() => start(async () => { await deleteBanner(b.id); router.refresh(); toast("Banner deleted"); })}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {banner && (
          <div className="mt-4 rounded-2xl border border-line p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Inp label="Title" value={banner.title} onChange={(v) => setBanner({ ...banner, title: v })} />
              <label className="block"><span className="mb-1 block text-sm text-ink-soft">Placement</span>
                <select value={banner.placement} onChange={(e) => setBanner({ ...banner, placement: e.target.value as Banner["placement"] })} className="h-11 w-full rounded-xl border border-line bg-paper px-3">
                  <option value="home_hero">Home hero</option><option value="promo_strip">Promo strip</option><option value="category">Category</option>
                </select>
              </label>
              <Inp label="Image URL" value={banner.image_url} onChange={(v) => setBanner({ ...banner, image_url: v })} />
              <Inp label="Link URL" value={banner.link_url} onChange={(v) => setBanner({ ...banner, link_url: v })} />
              <Inp label="Position" value={banner.position} onChange={(v) => setBanner({ ...banner, position: v })} type="number" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={banner.is_active} onChange={(e) => setBanner({ ...banner, is_active: e.target.checked })} className="accent-brand" /> Active</label>
            </div>
            <div className="mt-4 flex gap-2"><Button size="sm" onClick={saveBan} disabled={pending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setBanner(null)}>Cancel</Button></div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-accent">{error}</p>}
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
