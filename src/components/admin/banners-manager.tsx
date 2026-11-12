"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ImageIcon, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveBanner, deleteBanner } from "@/lib/admin/promo-actions";
import { useToast } from "@/components/admin/toast";
import type { AdminBanner } from "@/lib/admin/catalog-queries";

type Placement = "home_hero" | "promo_strip" | "category";

const PLACEMENTS: { value: Placement; label: string; blurb: string }[] = [
  { value: "home_hero", label: "Home hero", blurb: "Rotating slides at the top of the homepage." },
  { value: "promo_strip", label: "Promo strip", blurb: "Slim announcement bar above the storefront." },
  { value: "category", label: "Category", blurb: "Banners shown on category landing pages." },
];

type Draft = {
  id?: string;
  title: string;
  image_url: string;
  link_url: string;
  placement: Placement;
  position: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

function emptyDraft(placement: Placement): Draft {
  return { title: "", image_url: "", link_url: "", placement, position: "0", is_active: true, starts_at: "", ends_at: "" };
}

export function BannersManager({ banners }: { banners: AdminBanner[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!draft) return;
    setError(null);
    start(async () => {
      const res = await saveBanner({
        id: draft.id,
        title: draft.title,
        image_url: draft.image_url || null,
        link_url: draft.link_url,
        placement: draft.placement,
        position: Number(draft.position || 0),
        is_active: draft.is_active,
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
      });
      if (res.ok) {
        setDraft(null);
        router.refresh();
        toast("Banner saved");
      } else {
        setError(res.error ?? "Failed");
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteBanner(id);
      router.refresh();
      toast("Banner deleted");
    });
  }

  function toggleActive(b: AdminBanner) {
    start(async () => {
      const res = await saveBanner({
        id: b.id,
        title: b.title,
        image_url: b.image_url,
        link_url: b.link_url ?? "",
        placement: b.placement,
        position: b.position,
        is_active: !(b.is_active ?? true),
        starts_at: b.starts_at ?? null,
        ends_at: b.ends_at ?? null,
      });
      if (res.ok) {
        router.refresh();
        toast((b.is_active ?? true) ? "Banner hidden" : "Banner shown");
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  function edit(b: AdminBanner) {
    setDraft({
      id: b.id,
      title: b.title,
      image_url: b.image_url ?? "",
      link_url: b.link_url ?? "",
      placement: (b.placement as Placement) ?? "home_hero",
      position: String(b.position),
      is_active: b.is_active ?? true,
      starts_at: b.starts_at?.slice(0, 16) ?? "",
      ends_at: b.ends_at?.slice(0, 16) ?? "",
    });
  }

  return (
    <div className="space-y-10">
      {PLACEMENTS.map((pl) => {
        const rows = banners
          .filter((b) => b.placement === pl.value)
          .sort((a, b) => a.position - b.position);
        return (
          <section key={pl.value}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">{pl.label}</h2>
                <p className="text-sm text-ink-soft">{pl.blurb}</p>
              </div>
              <Button size="sm" onClick={() => setDraft(emptyDraft(pl.value))}>
                <Plus className="h-4 w-4" /> New banner
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
                No {pl.label.toLowerCase()} banners yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((b) => {
                  const active = b.is_active ?? true;
                  return (
                    <div
                      key={b.id}
                      className={`overflow-hidden rounded-2xl border border-line ${active ? "" : "opacity-60"}`}
                    >
                      <div className="relative aspect-[16/7] bg-paper-2">
                        {b.image_url ? (
                          <Image src={b.image_url} alt={b.title} fill className="object-cover" sizes="400px" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-ink-soft">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                          #{b.position}
                        </span>
                        <span
                          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            active ? "bg-brand text-paper" : "bg-ink-soft/20 text-ink-soft"
                          }`}
                        >
                          {active ? "Live" : "Hidden"}
                        </span>
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="line-clamp-1 font-medium">{b.title}</p>
                        {b.link_url ? (
                          <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {b.link_url}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-soft">No link</p>
                        )}
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-2 hover:text-ink"
                            title={active ? "Hide" : "Show"}
                            onClick={() => toggleActive(b)}
                            disabled={pending}
                          >
                            {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-2 hover:text-ink"
                            title="Edit"
                            onClick={() => edit(b)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-2 hover:text-accent"
                            title="Delete"
                            onClick={() => remove(b.id)}
                            disabled={pending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl border border-line bg-paper p-5 sm:rounded-2xl">
            <h3 className="mb-4 font-display text-lg font-semibold">{draft.id ? "Edit banner" : "New banner"}</h3>

            {draft.image_url && (
              <div className="relative mb-4 aspect-[16/7] overflow-hidden rounded-xl border border-line bg-paper-2">
                <Image src={draft.image_url} alt="Preview" fill className="object-cover" sizes="500px" unoptimized />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Inp label="Title" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
              </div>
              <label className="block">
                <span className="mb-1 block text-sm text-ink-soft">Placement</span>
                <select
                  value={draft.placement}
                  onChange={(e) => setDraft({ ...draft, placement: e.target.value as Placement })}
                  className="h-11 w-full rounded-xl border border-line bg-paper px-3"
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <Inp label="Position" value={draft.position} onChange={(v) => setDraft({ ...draft, position: v })} type="number" />
              <div className="sm:col-span-2">
                <Inp label="Image URL" value={draft.image_url} onChange={(v) => setDraft({ ...draft, image_url: v })} placeholder="https://…" />
              </div>
              <div className="sm:col-span-2">
                <Inp label="Link URL" value={draft.link_url} onChange={(v) => setDraft({ ...draft, link_url: v })} placeholder="/c/kids-corner" />
              </div>
              <Inp label="Starts" value={draft.starts_at} onChange={(v) => setDraft({ ...draft, starts_at: v })} type="datetime-local" />
              <Inp label="Ends" value={draft.ends_at} onChange={(v) => setDraft({ ...draft, ends_at: v })} type="datetime-local" />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  className="accent-brand"
                />{" "}
                Active (visible on storefront)
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-accent">{error}</p>}

            <div className="mt-5 flex gap-2">
              <Button size="sm" onClick={save} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setDraft(null); setError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Inp({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-paper px-3"
      />
    </label>
  );
}
