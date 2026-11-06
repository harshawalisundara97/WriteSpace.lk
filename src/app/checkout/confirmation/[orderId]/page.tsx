import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/pricing/money";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Order confirmation" };

export default async function ConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id,order_number,status,total_minor,currency,email")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await db
    .from("order_items")
    .select("product_name,quantity,line_total_minor")
    .eq("order_id", orderId);

  const paid = order.status === "paid" || order.status === "fulfilled" || order.status === "shipped" || order.status === "delivered";

  return (
    <div className="ws-container max-w-xl py-16">
      <div className="rounded-2xl border border-line bg-paper-2 p-8 text-center">
        {paid ? <CheckCircle2 className="mx-auto h-14 w-14 text-mint" /> : <Clock className="mx-auto h-14 w-14 text-gold" />}
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {paid ? "Order confirmed!" : "Payment processing…"}
        </h1>
        <p className="mt-2 text-ink-soft">
          {paid
            ? `Thanks! We've emailed a receipt to ${order.email}.`
            : "We're confirming your payment. This page will show the final status once it clears."}
        </p>
        <p className="mt-4 text-sm text-ink-soft">Order number</p>
        <p className="font-display text-lg font-semibold">{order.order_number}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-line p-6">
        <ul className="space-y-2 text-sm">
          {(items ?? []).map((i, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{i.quantity}× {i.product_name}</span>
              <span>{formatMoney(i.line_total_minor, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
          <span>Total</span><span>{formatMoney(order.total_minor, order.currency)}</span>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href="/products"><Button variant="outline">Continue shopping</Button></Link>
        <Link href="/account/orders"><Button>View my orders</Button></Link>
      </div>
    </div>
  );
}
