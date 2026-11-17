"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { unsubscribeCartReminders } from "@/lib/cart/unsubscribe-actions";

// A button (not a GET side effect) so email link scanners can't unsubscribe people.
export function UnsubscribeForm({ customerId, token }: { customerId: string; token: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (done) return <p role="status" className="mt-6 font-medium text-mint">Done — you won&apos;t get cart reminders any more.</p>;
  return (
    <div className="mt-6 space-y-3">
      <Button disabled={pending} onClick={() => start(async () => {
        const res = await unsubscribeCartReminders(customerId, token);
        if (res.ok) setDone(true); else setError(res.error ?? "Something went wrong");
      })}>{pending ? "Saving…" : "Stop cart reminders"}</Button>
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
