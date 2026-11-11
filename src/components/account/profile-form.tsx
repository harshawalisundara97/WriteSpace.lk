"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/account/actions";

export function ProfileForm({ email, fullName, phone }: { email: string; fullName: string | null; phone: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [tel, setTel] = useState(phone ?? "");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await updateProfile(name, tel);
      setMsg({ text: res.ok ? "Profile saved" : res.error ?? "Could not save", ok: res.ok });
      if (res.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Email</span>
        <input value={email} disabled className="h-11 w-full rounded-xl border border-line bg-paper-2 px-3 text-ink-soft" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Full name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Phone</span>
        <input value={tel} onChange={(e) => setTel(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30" />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {msg && <span className={msg.ok ? "text-sm text-mint" : "text-sm text-accent"}>{msg.text}</span>}
      </div>
    </form>
  );
}
