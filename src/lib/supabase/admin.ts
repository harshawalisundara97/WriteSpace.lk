import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. NEVER import into client components.
// Use only in server actions / route handlers for trusted operations
// (order creation, stock RPCs, webhook processing, audit writes).
export function createAdminClient() {
  // Placeholders in demo mode (no env) so construction never throws; any
  // actual request fails gracefully into an error result instead of crashing.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "demo-mode-no-service-role-key",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
