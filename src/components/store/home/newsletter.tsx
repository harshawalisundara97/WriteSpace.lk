"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeNewsletter } from "@/lib/newsletter";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await subscribeNewsletter(email);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong");
    });
  }

  return (
    <section className="ws-container mt-20 mb-4">
      <div className="overflow-hidden rounded-2xl bg-brand px-8 py-12 text-center text-paper sm:px-12">
        <Mail className="mx-auto h-8 w-8 opacity-80" />
        <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Get 10% off your first order</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-paper/80">Join our newsletter for new arrivals, deals and stationery inspiration.</p>
        <div className="mx-auto mt-6 max-w-md">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.p key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 text-paper">
                <Check className="h-5 w-5" /> You’re in! Check your inbox for the code.
              </motion.p>
            ) : (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0 }} className="flex flex-col gap-2 sm:flex-row">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="h-11 flex-1 rounded-full bg-paper px-4 text-ink outline-none placeholder:text-ink-soft" />
                <Button type="submit" variant="accent" disabled={pending}>{pending ? "Joining…" : "Subscribe"}</Button>
              </motion.form>
            )}
          </AnimatePresence>
          {error && <p className="mt-2 text-sm text-paper/90">{error}</p>}
        </div>
      </div>
    </section>
  );
}
