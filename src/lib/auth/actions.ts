"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthResult { ok: boolean; error?: string }

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
