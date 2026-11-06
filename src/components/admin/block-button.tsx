"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setCustomerBlocked } from "@/lib/admin/customer-actions";

export function BlockButton({ customerId, blocked }: { customerId: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant={blocked ? "outline" : "accent"} size="sm" disabled={pending}
      onClick={() => start(async () => { await setCustomerBlocked(customerId, !blocked); router.refresh(); })}>
      {pending ? "…" : blocked ? "Unblock" : "Block"}
    </Button>
  );
}
