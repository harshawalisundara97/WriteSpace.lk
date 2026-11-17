"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/admin/toast";
import { convertQuoteToOrder, declineQuote } from "@/lib/admin/quote-actions";

export function QuoteConvert({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending} onClick={() => start(async () => {
        const r = await convertQuoteToOrder(quoteId);
        if (r.ok && r.orderId) { toast("Order created"); router.push(`/admin/orders/${r.orderId}`); }
        else toast(r.error ?? "Could not create order", "error");
      })}>{pending ? "Creating…" : "Convert to order"}</Button>
      <Button variant="ghost" className="text-accent" disabled={pending} onClick={() => {
        if (confirm("Decline this accepted quote?")) start(async () => { const r = await declineQuote(quoteId); if (r.ok) router.refresh(); else toast(r.error ?? "Failed", "error"); });
      }}>Decline</Button>
    </div>
  );
}
