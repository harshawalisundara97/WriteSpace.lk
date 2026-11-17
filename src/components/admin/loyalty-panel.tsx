"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adjustLoyaltyPoints } from "@/lib/admin/customer-actions";
import { useToast } from "@/components/admin/toast";
import type { MyLoyalty } from "@/lib/loyalty/queries";

const KIND = { earn: "Earned", redeem: "Redeemed", adjust: "Adjustment", reverse: "Refund reversal" } as const;
const noteLabel = (n: string | null) => (n === "restore:cancelled" ? "Restored — order cancelled" : n);

export function LoyaltyPanel({ customerId, loyalty }: { customerId: string; loyalty: MyLoyalty }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await adjustLoyaltyPoints({ customer_id: customerId, points: Number(points), note });
      if (res.ok) { toast("Points adjusted"); setPoints(""); setNote(""); router.refresh(); }
      else toast(res.error ?? "Could not adjust points", "error");
    });
  }

  return (
    <section aria-labelledby="loyalty-admin-h" className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="loyalty-admin-h" className="font-medium">Loyalty points</h2>
        <p className="text-sm text-ink-soft">
          Balance <span className="font-display text-xl font-semibold text-ink">{loyalty.balance.toLocaleString("en-LK")}</span> pts
          {!loyalty.enabled && " · programme off"}
        </p>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Points (+ add / − remove)</span>
          <input type="number" step={1} required value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 100 or -50"
            className="w-36 rounded-xl border border-line bg-paper px-3 py-2 tabular-nums outline-none focus:ring-2 focus:ring-brand/30" />
        </label>
        <label className="block min-w-48 flex-1">
          <span className="mb-1 block text-sm text-ink-soft">Reason (shown to staff, audited)</span>
          <input required minLength={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Goodwill — late delivery"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30" />
        </label>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Adjust"}</Button>
      </form>

      {loyalty.history.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-ink-soft"><tr><th className="py-2">Date</th><th>Type</th><th>Detail</th><th className="text-right">Points</th></tr></thead>
          <tbody>
            {loyalty.history.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 text-ink-soft">{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{KIND[r.kind]}</td>
                <td className="text-ink-soft">{[r.order_number, noteLabel(r.note)].filter(Boolean).join(" · ") || "—"}</td>
                <td className={`text-right tabular-nums ${r.points > 0 ? "text-green-700" : ""}`}>{r.points > 0 ? "+" : ""}{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
