"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = mode === "login" ? await signIn(fd) : await signUp(fd);
    setLoading(false);
    if (!res.ok) { setError(res.error ?? "Something went wrong"); return; }
    if (mode === "register") { setError(null); router.push("/login?registered=1"); return; }
    router.push(params.get("next") || "/account/orders");
    router.refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
      <h1 className="font-display text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {mode === "login" ? "Sign in to track orders and check out faster." : "Save your details and track every order."}
      </p>
      {params.get("registered") && mode === "login" && (
        <p className="mt-4 rounded-xl bg-mint/15 px-4 py-3 text-sm text-mint">Account created — please sign in.</p>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-sm text-ink-soft">Full name</span>
            <input name="full_name" required className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Email</span>
          <input name="email" type="email" required className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-soft">Password</span>
          <input name="password" type="password" required minLength={8} className="h-11 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-brand/30" />
        </label>
        {error && <p className="text-sm text-accent">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <>New here? <Link href="/register" className="text-accent hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></>
        )}
      </p>
    </motion.div>
  );
}
