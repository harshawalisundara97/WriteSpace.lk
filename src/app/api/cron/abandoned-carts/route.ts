import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { getStoreSettings } from "@/lib/catalog/queries";
import { idleWindow, isAbandoned, unsubscribeSecret, unsubscribeToken } from "@/lib/cart/abandoned";
import { renderCartReminder, sendEmail } from "@/lib/email/marketing";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BATCH = 100;

// Abandoned-cart reminders — TASK-NEXT-006. Called by a scheduler (vercel.json
// cron) with `Authorization: Bearer $CRON_SECRET`. Safe to run repeatedly:
// each cart gets at most one reminder per idle period.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: true, sent: 0, demo: true });

  const db = createAdminClient();
  const { from, to } = idleWindow();
  const { data, error } = await db.from("carts")
    .select("id,updated_at,reminder_sent_at,customer:customers(id,email,full_name,is_blocked,cart_reminders_opt_out)," +
      "cart_items(quantity,variant:product_variants(name,price_minor,is_active,product:products(name,status)))")
    .not("customer_id", "is", null).is("reminder_sent_at", null)
    .gte("updated_at", from).lte("updated_at", to)
    .order("updated_at", { ascending: true }).limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string; updated_at: string; reminder_sent_at: string | null;
    customer: { id: string; email: string | null; full_name: string | null; is_blocked: boolean; cart_reminders_opt_out: boolean } | null;
    cart_items: { quantity: number; variant: { name: string | null; price_minor: number; is_active: boolean; product: { name: string; status: string } | null } | null }[];
  };
  const { currency } = await getStoreSettings();
  const unsubSecret = unsubscribeSecret();
  let sent = 0, skipped = 0;
  const now = new Date();

  for (const cart of (data ?? []) as unknown as Row[]) {
    const items = cart.cart_items
      .filter((i) => i.variant?.is_active && i.variant.product?.status === "published")
      .map((i) => ({ name: i.variant!.name ? `${i.variant!.product!.name} (${i.variant!.name})` : i.variant!.product!.name, quantity: i.quantity, unitMinor: i.variant!.price_minor }));
    const c = cart.customer;
    if (!c || !isAbandoned({
      updated_at: cart.updated_at, reminder_sent_at: cart.reminder_sent_at, item_count: items.length,
      opted_out: c.cart_reminders_opt_out, blocked: c.is_blocked, email: c.email,
    }, now)) { skipped++; continue; }

    const unsubscribeUrl = `${SITE}/unsubscribe?c=${c.id}&t=${unsubscribeToken(c.id, unsubSecret)}`;
    const ok = await sendEmail(c.email!, renderCartReminder({
      firstName: c.full_name?.trim().split(/\s+/)[0] ?? null, items, currency, cartUrl: `${SITE}/cart`, unsubscribeUrl,
    }), { "List-Unsubscribe": `<${unsubscribeUrl}>` });
    if (!ok) { skipped++; continue; }
    // Stamping reminder_sent_at also bumps updated_at (carts trigger) — fine:
    // only a cart_items change re-arms the reminder.
    await db.from("carts").update({ reminder_sent_at: now.toISOString() }).eq("id", cart.id);
    await db.from("audit_logs").insert({ action: "cart.reminder_sent", entity: "carts", entity_id: cart.id, after: { customer_id: c.id, items: items.length } });
    sent++;
  }
  return NextResponse.json({ ok: true, sent, skipped });
}
