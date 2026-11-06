"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteStaff, setStaff, removeStaff, ALL_PERMISSIONS } from "@/lib/admin/staff-actions";

type Row = { id: string; role: "admin" | "staff"; permissions: string[]; email: string; self: boolean };

export function StaffManager({ staff }: { staff: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [perms, setPerms] = useState<string[]>(["orders:write"]);
  const [msg, setMsg] = useState<string | null>(null);

  function togglePerm(p: string) {
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line p-5">
        <h2 className="mb-3 font-medium">Invite staff</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Email of existing account" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl border border-line bg-paper px-3" />
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "staff")} className="h-11 rounded-xl border border-line bg-paper px-3">
            <option value="staff">Staff (limited)</option><option value="admin">Admin (full access)</option>
          </select>
        </div>
        {role === "staff" && (
          <div className="mt-3 flex flex-wrap gap-3">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="accent-brand" /> {p}
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" disabled={pending} onClick={() => { setMsg(null); start(async () => {
            const res = await inviteStaff(email, role, perms);
            if (res.ok) { setEmail(""); router.refresh(); setMsg("Access granted"); } else setMsg(res.error ?? "Failed");
          }); }}>Grant access</Button>
          {msg && <span className="text-sm text-ink-soft">{msg}</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Permissions</th><th /></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-line align-top">
                <td className="px-4 py-3">{s.email}{s.self && <span className="ml-2 text-xs text-ink-soft">(you)</span>}</td>
                <td className="px-4 py-3">
                  <select defaultValue={s.role} disabled={pending} onChange={(e) => start(async () => { await setStaff(s.id, e.target.value as "admin" | "staff", s.permissions); router.refresh(); })} className="rounded-lg border border-line bg-paper px-2 py-1">
                    <option value="staff">Staff</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">{s.role === "admin" ? "All" : s.permissions.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-right">
                  {!s.self && <button className="text-ink-soft hover:text-accent" onClick={() => start(async () => { await removeStaff(s.id); router.refresh(); })}><Trash2 className="h-4 w-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
