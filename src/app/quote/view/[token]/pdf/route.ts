import { getQuoteByToken } from "@/lib/quotes/queries";
import { getStoreSettings } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/pricing/money";
import { quoteTotals } from "@/lib/quotes/rules";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date(iso));

// Printable quotation (browser "Save as PDF"), same look as the admin invoice. Token is the credential.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getQuoteByToken(token);
  if (!data || data.quote.status === "requested") return new Response("Not found", { status: 404 });
  const { quote, items } = data;
  const s = await getStoreSettings();
  const t = quoteTotals(items, quote.shipping_minor);
  const rows = items.map((i) => {
    const unit = i.quoted_unit_minor ?? i.list_unit_minor;
    return `<tr><td>${esc(i.name)}${i.sku ? `<div class="m">${esc(i.sku)}</div>` : ""}</td><td class="r">${i.qty.toLocaleString("en-LK")}</td><td class="r">${formatMoney(unit, "LKR")}</td><td class="r">${formatMoney(unit * i.qty, "LKR")}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Quotation ${esc(quote.quote_number)}</title>
<meta name="robots" content="noindex">
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b;margin:0;background:#f6f5f2}
  .page{max-width:760px;margin:24px auto;background:#fff;padding:40px;border:1px solid #ecebe7;border-radius:12px}
  h1{margin:0;font-size:26px} .m{color:#8a8a8a;font-size:12px} .head{display:flex;justify-content:space-between;gap:24px;margin-bottom:28px}
  table{width:100%;border-collapse:collapse;font-size:14px} th{text-align:left;color:#8a8a8a;font-weight:500;border-bottom:1px solid #ecebe7;padding:8px 0}
  td{padding:8px 0;border-bottom:1px solid #f3f2ef;vertical-align:top} .r{text-align:right}
  .totals{margin-left:auto;width:280px;margin-top:16px;font-size:14px} .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{border-top:1px solid #ecebe7;font-weight:700;font-size:16px;padding-top:8px!important} .save{color:#15803d}
  .foot{margin-top:32px;color:#8a8a8a;font-size:12px} .btn{display:inline-block;margin:16px auto 0;padding:8px 16px;border-radius:999px;background:#4f46e5;color:#fff;border:0;font:inherit;cursor:pointer}
  @media print{body{background:#fff}.page{border:0;margin:0;padding:0}.noprint{display:none}}
</style></head><body>
  <div class="noprint" style="text-align:center"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
  <div class="page">
    <div class="head">
      <div><strong style="font-size:20px;color:#4f46e5">${esc(s.store_name)}</strong>
        <div class="m">${[s.address, s.support_phone, s.support_email].filter(Boolean).map((x) => esc(String(x))).join("<br>")}</div></div>
      <div style="text-align:right"><h1>Quotation</h1><div class="m">${esc(quote.quote_number)}<br>Issued ${day(quote.created_at)}${quote.valid_until ? `<br>Valid until ${day(quote.valid_until)}` : ""}${quote.po_number ? `<br>PO ${esc(quote.po_number)}` : ""}</div></div>
    </div>
    <p style="font-size:14px"><span class="m">Prepared for</span><br><strong>${esc(quote.company ?? quote.contact_name)}</strong>${quote.company ? `<br>${esc(quote.contact_name)}` : ""}</p>
    <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Items</span><span>${formatMoney(t.subtotal_minor, "LKR")}</span></div>
      ${quote.shipping_minor > 0 ? `<div><span>Delivery</span><span>${formatMoney(quote.shipping_minor, "LKR")}</span></div>` : ""}
      ${t.savings_minor > 0 ? `<div class="save"><span>Saving vs list</span><span>${formatMoney(t.savings_minor, "LKR")}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${formatMoney(t.total_minor, "LKR")}</span></div>
    </div>
    <div class="foot">Prices in LKR. Payment by bank transfer against invoice. Stock is confirmed when the order is placed.</div>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
