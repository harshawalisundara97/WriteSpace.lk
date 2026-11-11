"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestPasswordReset(email);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong");
    });
  }

  return (
    <div className="ws-container py-20">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-soft">Enter your email and we’ll send you a reset link.</p>
        {done ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-mint/15 px-4 py-3 text-sm text-mint">
            <Check className="h-5 w-5" /> If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-ink-soft">Email</span>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 focus-within:ring-2 focus-within:ring-brand/30">
                <Mail className="h-4 w-4 text-ink-soft" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 flex-1 bg-transparent outline-none" placeholder="you@example.com" />
              </div>
            </label>
            {error && <p className="text-sm text-accent">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-ink-soft"><Link href="/login" className="text-accent hover:underline">Back to sign in</Link></p>
      </motion.div>
    </div>
  );
}
