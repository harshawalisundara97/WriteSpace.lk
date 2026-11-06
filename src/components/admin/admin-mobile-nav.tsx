"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/types";

export function AdminMobileNav({ role, permissions }: { role: AppRole; permissions: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <Link href="/" className="font-display text-lg font-semibold text-brand">WriteSpace<span className="text-accent">.lk</span></Link>
        <button aria-label="Menu" onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-2"><Menu className="h-5 w-5" /></button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-paper p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <Link href="/" className="font-display text-lg font-semibold text-brand">WriteSpace<span className="text-accent">.lk</span></Link>
                <button aria-label="Close" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-2"><X className="h-5 w-5" /></button>
              </div>
              <AdminNav role={role} permissions={permissions} onNavigate={() => setOpen(false)} />
              <div className="mt-auto border-t border-line pt-4">
                <p className="mb-2 text-xs capitalize text-ink-soft">{role}</p>
                <form action={signOut}><Button variant="ghost" size="sm">Sign out</Button></form>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
