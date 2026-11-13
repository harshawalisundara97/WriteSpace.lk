"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { addressBookSchema } from "@/lib/validation/address";
import { demoAddresses } from "@/lib/demo/data";

export interface SavedAddress {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string | null;
  country: string;
  is_default: boolean;
}

const COLS = "id,label,full_name,phone,line1,line2,city,postal_code,country,is_default";
const DEMO_MSG = "Demo mode — connect Supabase to save addresses.";

// Current user's saved addresses, default first. Demo mode returns fixtures.
export async function getMyAddresses(): Promise<SavedAddress[]> {
  if (!hasSupabase()) return demoAddresses;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("addresses")
    .select(COLS)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as SavedAddress[];
}

// Create (id omitted) or update an address. Setting is_default unsets the rest.
export async function saveAddress(raw: unknown, id?: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = addressBookSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address" };
  if (!hasSupabase()) return { ok: false, error: DEMO_MSG };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in" };

  const v = parsed.data;
  const row = {
    customer_id: user.id,
    label: v.label || null,
    full_name: v.full_name,
    phone: v.phone,
    line1: v.line1,
    line2: v.line2 || null,
    city: v.city,
    postal_code: v.postal_code || null,
    country: v.country,
    is_default: v.is_default,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("addresses").update(row).eq("id", id).eq("customer_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("addresses").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    savedId = data?.id;
  }

  // Keep a single default per customer.
  if (v.is_default && savedId) {
    await supabase.from("addresses").update({ is_default: false }).eq("customer_id", user.id).neq("id", savedId);
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) return { ok: false, error: DEMO_MSG };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in" };
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("customer_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) return { ok: false, error: DEMO_MSG };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in" };
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("customer_id", user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("addresses").update({ is_default: false }).eq("customer_id", user.id).neq("id", id);
  revalidatePath("/account/addresses");
  return { ok: true };
}
