import { NextRequest, NextResponse } from "next/server";
import { renderOrderEmail, type OrderEmailKind, type OrderEmailData } from "@/lib/email/order";

export const dynamic = "force-dynamic";

const KINDS: OrderEmailKind[] = ["confirmation", "shipped", "refunded"];

const SAMPLE: OrderEmailData = {
  to: "customer@example.com",
  orderNumber: "WS-20261106-1042",
  totalMinor: 246500,
  currency: "LKR",
  items: [
    { name: "Rainbow Gel Pens (12-pack)", quantity: 1, lineTotalMinor: 85000 },
    { name: "A5 Dotted Notebook", quantity: 1, lineTotalMinor: 150000 },
  ],
  trackingNumber: "LK4820193",
  refundMinor: 85000,
};

// Renders a transactional email template with sample data for visual review.
// No data is read or sent — purely renders the template HTML.
export async function GET(req: NextRequest) {
  const typeParam = req.nextUrl.searchParams.get("type") as OrderEmailKind | null;
  const kind: OrderEmailKind = typeParam && KINDS.includes(typeParam) ? typeParam : "confirmation";
  const { html } = renderOrderEmail(kind, SAMPLE);

  // Small switcher bar above the rendered email.
  const tabs = KINDS.map(
    (k) => `<a href="?type=${k}" style="padding:6px 12px;border-radius:999px;text-decoration:none;font:14px system-ui;margin-right:6px;${k === kind ? "background:#4f46e5;color:#fff" : "background:#eceae6;color:#333"}">${k}</a>`,
  ).join("");
  const page = `<!doctype html><html><body style="margin:0">
    <div style="padding:16px 24px;background:#fff;border-bottom:1px solid #eee;font-family:system-ui">
      <strong>Email preview</strong> &nbsp; ${tabs}
    </div>
    ${html}
  </body></html>`;

  return new NextResponse(page, { headers: { "content-type": "text/html; charset=utf-8" } });
}
