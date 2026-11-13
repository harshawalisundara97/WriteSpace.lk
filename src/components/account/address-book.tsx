"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Trash2, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAddress, deleteAddress, setDefaultAddress, type SavedAddress } from "@/lib/account/addresses";

type FormState = {
  label: string; full_name: string; phone: string; line1: string;
  line2: string; city: string; postal_code: string; is_default: boolean;
};

const empty: FormState = { label: "", full_name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", is_default: false };

function toForm(a: SavedAddress): FormState {
  return {
    label: a.label ?? "", full_name: a.full_name, phone: a.phone, line1: a.line1,
    line2: a.line2 ?? "", city: a.city, postal_code: a.postal_code ?? "", is_default: a.is_default,
  };
}

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  const [form, setForm] = useState<FormState>(empty);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  function openNew() { setForm(empty); setMsg(null); setEditing("new"); }
  function openEdit(a: SavedAddress) { setForm(toForm(a)); setMsg(null); setEditing(a.id); }
  function close() { setEditing(null); setMsg(null); }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const id = editing === "new" ? undefined : editing ?? undefined;
    start(async () => {
      const res = await saveAddress({ ...form, country: "LK" }, id);
      if (res.ok) { setEditing(null); router.refresh(); }
      else setMsg({ text: res.error ?? "Could not save", ok: false });
    });
  }

  function remove(id: string) {
    setMsg(null);
    start(async () => {
      const res = await deleteAddress(id);
      if (res.ok) router.refresh();
      else setMsg({ text: res.error ?? "Could not delete", ok: false });
    });
  }

  function makeDefault(id: string) {
    setMsg(null);
    start(async () => {
      const res = await setDefaultAddress(id);
      if (res.ok) router.refresh();
      else setMsg({ text: res.error ?? "Could not update", ok: false });
    });
  }

  return (
    <div className="space-y-5">
      {addresses.length === 0 && editing !== "new" ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-soft">
          <MapPin className="mx-auto h-6 w-6" />
          <p className="mt-2">No saved addresses yet.</p>
          <Button className="mt-4" onClick={openNew}>Add an address</Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="relative rounded-2xl border border-line bg-paper p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {a.label || "Address"}
                    {a.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        <Star className="h-3 w-3 fill-brand" /> Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-ink">{a.full_name}</p>
                  <p className="text-sm text-ink-soft">{a.phone}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                    {a.city}{a.postal_code ? ` ${a.postal_code}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!a.is_default && (
                  <Button variant="ghost" size="sm" onClick={() => makeDefault(a.id)} disabled={pending}>Set default</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)} disabled={pending}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(a.id)} disabled={pending} className="text-accent hover:text-accent">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {addresses.length > 0 && editing !== "new" && (
        <Button variant="outline" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add address</Button>
      )}

      {editing !== null && (
        <form onSubmit={submit} className="rounded-2xl border border-line bg-paper-2 p-5">
          <h2 className="font-display text-lg font-semibold">{editing === "new" ? "Add a new address" : "Edit address"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <F label="Label (optional)" value={form.label} onChange={(v) => set("label", v)} placeholder="Home, Office…" />
            <F label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} required />
            <F label="Phone" value={form.phone} onChange={(v) => set("phone", v)} required />
            <F label="City" value={form.city} onChange={(v) => set("city", v)} required />
            <div className="sm:col-span-2"><F label="Address" value={form.line1} onChange={(v) => set("line1", v)} required /></div>
            <div className="sm:col-span-2"><F label="Address line 2 (optional)" value={form.line2} onChange={(v) => set("line2", v)} /></div>
            <F label="Postal code (optional)" value={form.postal_code} onChange={(v) => set("postal_code", v)} />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_default} onChange={(e) => set("is_default", e.target.checked)} className="h-4 w-4 accent-brand" />
            Set as default delivery address
          </label>
          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save address"}</Button>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            {msg && <span className={msg.ok ? "text-sm text-mint" : "text-sm text-accent"}>{msg.text}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function F({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-soft">{label}</span>
      <input
        value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
