"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateOrderNotes } from "@/lib/admin/order-actions";
import { useToast } from "@/components/admin/toast";

export function OrderNotes({ orderId, notes }: { orderId: string; notes: string | null }) {
  const toast = useToast();
  const [value, setValue] = useState(notes ?? "");
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3}
        placeholder="Internal notes (visible only to staff)…"
        className="w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:ring-2 focus:ring-brand/30" />
      <Button size="sm" className="mt-2" variant="outline" disabled={pending}
        onClick={() => start(async () => {
          const res = await updateOrderNotes(orderId, value);
          toast(res.ok ? "Note saved" : res.error ?? "Could not save", res.ok ? "success" : "error");
        })}>
        {pending ? "Saving…" : "Save note"}
      </Button>
    </div>
  );
}
