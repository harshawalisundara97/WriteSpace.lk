// True when Supabase is configured. When false, the app runs in "demo mode":
// catalog reads come from an in-repo fixture and cart/checkout/admin are
// read-only, so the storefront is viewable with zero backend setup.
export function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
