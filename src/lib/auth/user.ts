import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { demoUser } from "@/lib/demo/data";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

// Returns the signed-in user, or a demo user in demo mode, or null when no one
// is signed in (real backend connected but no session).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSupabase()) return demoUser;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: c } = await supabase.from("customers").select("full_name,phone,email").eq("id", user.id).maybeSingle();
  return { id: user.id, email: c?.email ?? user.email ?? "", full_name: c?.full_name ?? null, phone: c?.phone ?? null };
}
