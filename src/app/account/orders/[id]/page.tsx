import { notFound } from "next/navigation";
import { getMyOrder } from "@/lib/account/queries";
import { StatusTimeline } from "@/components/account/status-timeline";
import { StatusBadge } from "@/components/store/status-badge";
import { ReorderButton } from "@/components/account/reorder-button";
import { formatMoney } from "@/lib/pricing/money";
import { deliveryMethod } from "@/lib/checkout/delivery";

export const metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMyOrder(id);
  if (!data) notFound();
  const { order, items } = data;
  const addr = order.shipping_address as Record<string, string> | null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{order.order_number}</h1>
          <p className="mt-1 text-sm text-ink-soft">Placed {new Date(order.placed_at ?? order.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="rounded-2xl border border-line p-6"><StatusTimeline status={order.status} /></div>

      {order.tracking_number && (
        <p className="mt-4 text-sm">Tracking number: <span className="font-medium">{order.tracking_number}</span></p>
      )}

      <div className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="mb-4 font-medium">Items</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{i.quantity}× {i.product_name} <span className="text-ink-soft">({i.sku})</span></span>
              <span>{formatMoney(i.line_total_minor, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatMoney(order.subtotal_minor, order.currency)}</dd></div>
          {order.discount_minor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="text-accent">− {formatMoney(order.discount_minor, order.currency)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">{deliveryMethod(order.delivery_method).label}</dt><dd>{order.shipping_minor === 0 ? "Free" : formatMoney(order.shipping_minor, order.currency)}</dd></div>
          {order.tax_minor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Tax</dt><dd>{formatMoney(order.tax_minor, order.currency)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatMoney(order.total_minor, order.currency)}</dd></div>
        </dl>
      </div>

      {addr && (
        <div className="mt-6 rounded-2xl border border-line p-6 text-sm">
          <h2 className="mb-2 font-medium">{deliveryMethod(order.delivery_method).needsAddress ? "Delivery to" : "Store pickup"}</h2>
          <p className="text-ink-soft">{addr.full_name}<br />{addr.line1 && <>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city} {addr.postal_code}<br /></>}{addr.phone}</p>
        </div>
      )}

      <div className="mt-6"><ReorderButton orderId={order.id} /></div>
    </div>
  );
}
