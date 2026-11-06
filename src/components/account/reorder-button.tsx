"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { reorder } from "@/lib/account/actions";

export function ReorderButton({ orderId }: { orderId: string }) {
  const cart = useCart();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" disabled={pending} onClick={() => start(async () => {
        const res = await reorder(orderId);
        if (res.ok) { await cart.refresh(); cart.open(); setMsg(`Added ${res.added} item${res.added === 1 ? "" : "s"}`); }
        else setMsg(res.error ?? "Could not reorder");
      })}>
        {pending ? "Adding…" : "Reorder"}
      </Button>
      {msg && <span className="text-sm text-ink-soft">{msg}</span>}
    </div>
  );
}
