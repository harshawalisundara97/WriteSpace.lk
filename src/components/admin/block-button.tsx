"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setCustomerBlocked } from "@/lib/admin/customer-actions";
import { useToast } from "@/components/admin/toast";

export function BlockButton({ customerId, blocked }: { customerId: string; blocked: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button variant={blocked ? "outline" : "accent"} size="sm" disabled={pending}
      onClick={() => start(async () => {
        const res = await setCustomerBlocked(customerId, !blocked);
        if (res.ok) { toast(blocked ? "Customer unblocked" : "Customer blocked"); router.refresh(); }
        else toast("Could not update customer", "error");
      })}>
      {pending ? "…" : blocked ? "Unblock" : "Block"}
    </Button>
  );
}
