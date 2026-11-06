import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/admin/queries";
import { OrderControls } from "@/components/admin/order-controls";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";
import type { OrderStatus } from "@/lib/types";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  const { order, items, payment, refunds } = data;
  const addr = order.shipping_address as Record<string, string> | null;
  const status = order.status as OrderStatus;
  const canRefund = ["paid", "fulfilled", "shipped", "delivered", "partially_refunded"].includes(status) && !!payment?.provider_payment_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{order.order_number}</h1>
          <p className="mt-1 text-sm text-ink-soft">{order.email} · {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-line p-6">
            <h2 className="mb-4 font-medium">Items</h2>
            <ul className="space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.quantity}× {i.product_name} <span className="text-ink-soft">({i.sku})</span></span>
                  <span>{formatMoney(i.line_total_minor, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatMoney(order.subtotal_minor, order.currency)}</dd></div>
              {order.discount_minor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="text-accent">− {formatMoney(order.discount_minor, order.currency)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd>{order.shipping_minor === 0 ? "Free" : formatMoney(order.shipping_minor, order.currency)}</dd></div>
              {order.tax_minor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Tax</dt><dd>{formatMoney(order.tax_minor, order.currency)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatMoney(order.total_minor, order.currency)}</dd></div>
            </dl>
          </div>

          {addr && (
            <div className="rounded-2xl border border-line p-6 text-sm">
              <h2 className="mb-2 font-medium">Delivery</h2>
              <p className="text-ink-soft">{addr.full_name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city} {addr.postal_code}<br />{addr.phone}</p>
              {addr.notes && <p className="mt-2 text-ink-soft">Notes: {addr.notes}</p>}
            </div>
          )}

          {refunds.length > 0 && (
            <div className="rounded-2xl border border-line p-6 text-sm">
              <h2 className="mb-2 font-medium">Refund history</h2>
              <ul className="space-y-1">
                {refunds.map((r) => (
                  <li key={r.id} className="flex justify-between text-ink-soft">
                    <span>{formatMoney(r.amount_minor, order.currency)} · {r.status}{r.restocked ? " · restocked" : ""}</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line p-6">
          <OrderControls
            orderId={order.id}
            status={status}
            totalMinor={order.total_minor}
            currency={order.currency}
            tracking={order.tracking_number}
            canRefund={canRefund}
          />
        </div>
      </div>
    </div>
  );
}
