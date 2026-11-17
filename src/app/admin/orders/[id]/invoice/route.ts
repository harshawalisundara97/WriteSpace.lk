import { getAdminContext } from "@/lib/auth/guards";
import { getAdminOrder } from "@/lib/admin/queries";
import { getStoreSettings } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/pricing/money";
import { deliveryMethod } from "@/lib/checkout/delivery";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext();
  if (!ctx) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) return new Response("Not found", { status: 404 });
  const { order, items } = data;
  // ?slip=1 → packing slip: no prices, gift message shown (TASK-NEXT-007).
  const slip = new URL(req.url).searchParams.get("slip") === "1";
  const g = order as { gift_wrap?: boolean; gift_wrap_minor?: number; gift_message?: string | null; cod_fee_minor?: number; loyalty_points_redeemed?: number; loyalty_discount_minor?: number };
  const docTitle = slip ? "Packing slip" : "Invoice";
  const settings = await getStoreSettings();
  const addr = (order.shipping_address ?? {}) as Record<string, string>;
  const cur = order.currency;
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(order.created_at));

  const slipRows = items.map((i: { product_name: string; sku: string; quantity: number }) =>
    `<tr><td><span class="box"></span></td><td>${esc(i.product_name)}<div class="sku">${esc(i.sku)}</div></td><td class="r">${i.quantity}</td></tr>`,
  ).join("");
  const giftBox = g.gift_wrap
    ? `<div class="gift"><strong>🎁 Gift wrap this order</strong>${g.gift_message ? `<p>${esc(g.gift_message).replace(/\n/g, "<br>")}</p>` : ""}</div>`
    : "";
  const rows = items.map((i: { product_name: string; sku: string; quantity: number; unit_price_minor: number; line_total_minor: number }) =>
    `<tr><td>${esc(i.product_name)}<div class="sku">${esc(i.sku)}</div></td><td class="r">${i.quantity}</td><td class="r">${formatMoney(i.unit_price_minor, cur)}</td><td class="r">${formatMoney(i.line_total_minor, cur)}</td></tr>`,
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle} ${esc(order.order_number)}</title>
<style>
  :root { --ink:#1c1a2e; --soft:#4a475e; --line:#e7ddd0; --brand:#3b3a7a; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; color: var(--ink); margin: 0; background: #faf7f2; }
  .sheet { max-width: 720px; margin: 24px auto; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 40px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .brand { font-size: 22px; font-weight: 700; color: var(--brand); }
  .brand span { color: #ff6b57; }
  h1 { font-size: 15px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); margin: 0 0 4px; }
  .muted { color: var(--soft); font-size: 13px; }
  .cols { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th { text-align: left; color: var(--soft); font-weight: 600; border-bottom: 1px solid var(--line); padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .r { text-align: right; }
  .sku { color: var(--soft); font-size: 11px; }
  .totals { margin-left: auto; width: 260px; margin-top: 16px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 6px; }
  .totals .grand { border-top: 1px solid var(--line); margin-top: 4px; padding-top: 8px; font-weight: 700; font-size: 15px; }
  .box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid var(--soft); border-radius: 3px; }
  .gift { margin: 0 0 20px; padding: 14px 16px; border: 1.5px dashed var(--brand); border-radius: 10px; font-size: 14px; }
  .gift p { margin: 8px 0 0; font-size: 16px; font-style: italic; }
  .foot { margin-top: 32px; color: var(--soft); font-size: 12px; text-align: center; }
  .bar { position: sticky; top: 0; background: #faf7f2; padding: 12px 0; text-align: center; }
  .btn { background: var(--brand); color: #fff; border: 0; border-radius: 999px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  @media print { .bar { display: none; } body { background: #fff; } .sheet { border: 0; margin: 0; border-radius: 0; } }
</style></head>
<body>
  <div class="bar"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="top">
      <div><div class="brand">${esc(settings.store_name)}<span>${esc(settings.store_name.endsWith(".lk") ? "" : ".lk")}</span></div><div class="muted">Stationery for kids & adults</div></div>
      <div style="text-align:right"><h1>${docTitle}</h1><div style="font-weight:600">${esc(order.order_number)}</div><div class="muted">${date}</div></div>
    </div>
    <div class="cols">
      <div><div class="muted" style="margin-bottom:4px">${slip ? "Ship to" : "Bill to"}</div>${esc(addr.full_name ?? order.email)}<br>${esc(addr.line1 ?? "")}${addr.line2 ? "<br>" + esc(addr.line2) : ""}<br>${esc([addr.city, addr.postal_code].filter(Boolean).join(" "))}<br>${esc(addr.phone ?? "")}<br>${esc(order.email)}</div>
      <div style="text-align:right"><div class="muted" style="margin-bottom:4px">Status</div><span style="text-transform:capitalize">${esc(String(order.status).replace(/_/g, " "))}</span></div>
    </div>
    ${slip ? giftBox + `<table>
      <thead><tr><th style="width:28px"></th><th>Item</th><th class="r">Qty</th></tr></thead>
      <tbody>${slipRows}</tbody>
    </table>` : `<table>
      <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatMoney(order.subtotal_minor, cur)}</span></div>
      ${order.discount_minor > 0 ? `<div><span>Discount</span><span>− ${formatMoney(order.discount_minor, cur)}</span></div>` : ""}
      <div><span>${deliveryMethod(order.delivery_method).label}</span><span>${order.shipping_minor === 0 ? "Free" : formatMoney(order.shipping_minor, cur)}</span></div>
      ${(g.loyalty_discount_minor ?? 0) > 0 ? `<div><span>Loyalty points (${g.loyalty_points_redeemed})</span><span>− ${formatMoney(g.loyalty_discount_minor!, cur)}</span></div>` : ""}
      ${(g.cod_fee_minor ?? 0) > 0 ? `<div><span>Cash on delivery fee</span><span>${formatMoney(g.cod_fee_minor!, cur)}</span></div>` : ""}
      ${g.gift_wrap ? `<div><span>Gift wrap</span><span>${(g.gift_wrap_minor ?? 0) > 0 ? formatMoney(g.gift_wrap_minor!, cur) : "Free"}</span></div>` : ""}
      ${order.tax_minor > 0 ? `<div><span>Tax</span><span>${formatMoney(order.tax_minor, cur)}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${formatMoney(order.total_minor, cur)}</span></div>
    </div>`}
    <div class="foot">Thank you for shopping with ${esc(settings.store_name)} · All prices in ${esc(cur)}</div>
  </div>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
