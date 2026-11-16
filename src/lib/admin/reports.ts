// Pure report builders (no server-only) — shared by the reports page, CSV export and tests.
// All money stays in integer minor units; formatting happens at display / CSV time.
import { toMajor } from "@/lib/pricing/money";

export const REPORT_PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered"] as const;
export const REPORT_TYPES = ["sales", "tax", "products"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface ReportOrder {
  id: string; status: string; created_at: string; currency: string;
  subtotal_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; total_minor: number;
}
export interface ReportItem { order_id: string; product_name: string; sku: string; quantity: number; line_total_minor: number }

export interface DateWindow { from: string; to: string } // inclusive YYYY-MM-DD (UTC)

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;
const dayMs = 86400_000;
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Parse ?from=&to= — falls back to the last 30 days; swaps reversed input; caps the span.
export function parseDateWindow(from?: string | null, to?: string | null, now = Date.now()): DateWindow {
  const valid = (s?: string | null): s is string => !!s && ISO_DAY.test(s) && !Number.isNaN(Date.parse(s));
  let t = valid(to) ? to : fmtDay(now);
  let f = valid(from) ? from : fmtDay(Date.parse(t) - 29 * dayMs);
  if (f > t) [f, t] = [t, f];
  if ((Date.parse(t) - Date.parse(f)) / dayMs >= MAX_DAYS) f = fmtDay(Date.parse(t) - (MAX_DAYS - 1) * dayMs);
  return { from: f, to: t };
}

// Half-open UTC bounds [start, end) for DB queries.
export function windowBounds(w: DateWindow): { start: string; end: string } {
  return { start: `${w.from}T00:00:00.000Z`, end: new Date(Date.parse(w.to) + dayMs).toISOString() };
}

const inWindow = (iso: string, w: DateWindow) => { const d = iso.slice(0, 10); return d >= w.from && d <= w.to; };
const isPaid = (s: string) => (REPORT_PAID_STATUSES as readonly string[]).includes(s);

export interface DailyRow { date: string; orders: number; gross_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; net_minor: number }
export interface ProductRow { product_name: string; sku: string; quantity: number; revenue_minor: number }
export interface SalesReport {
  window: DateWindow; currency: string;
  summary: { orders: number; gross_minor: number; discount_minor: number; shipping_minor: number; tax_minor: number; net_minor: number; aov_minor: number; units: number };
  daily: DailyRow[];
  products: ProductRow[];
}

export function buildSalesReport(orders: ReportOrder[], items: ReportItem[], w: DateWindow): SalesReport {
  const paid = orders.filter((o) => isPaid(o.status) && inWindow(o.created_at, w));
  const paidIds = new Set(paid.map((o) => o.id));

  const days = new Map<string, DailyRow>();
  for (let ms = Date.parse(w.from); ms <= Date.parse(w.to); ms += dayMs) {
    const date = fmtDay(ms);
    days.set(date, { date, orders: 0, gross_minor: 0, discount_minor: 0, shipping_minor: 0, tax_minor: 0, net_minor: 0 });
  }
  for (const o of paid) {
    const r = days.get(o.created_at.slice(0, 10));
    if (!r) continue;
    r.orders += 1; r.gross_minor += o.subtotal_minor; r.discount_minor += o.discount_minor;
    r.shipping_minor += o.shipping_minor; r.tax_minor += o.tax_minor; r.net_minor += o.total_minor;
  }
  const daily = Array.from(days.values());

  const prod = new Map<string, ProductRow>();
  let units = 0;
  for (const it of items) {
    if (!paidIds.has(it.order_id)) continue;
    units += it.quantity;
    const p = prod.get(it.sku) ?? { product_name: it.product_name, sku: it.sku, quantity: 0, revenue_minor: 0 };
    p.quantity += it.quantity; p.revenue_minor += it.line_total_minor;
    prod.set(it.sku, p);
  }
  const products = Array.from(prod.values()).sort((a, b) => b.revenue_minor - a.revenue_minor || b.quantity - a.quantity);

  const sum = (k: Exclude<keyof DailyRow, "date">) => daily.reduce((s, r) => s + r[k], 0);
  const net = sum("net_minor");
  return {
    window: w, currency: paid[0]?.currency ?? "LKR",
    summary: {
      orders: paid.length, gross_minor: sum("gross_minor"), discount_minor: sum("discount_minor"),
      shipping_minor: sum("shipping_minor"), tax_minor: sum("tax_minor"), net_minor: net,
      aov_minor: paid.length ? Math.round(net / paid.length) : 0, units,
    },
    daily, products,
  };
}

// ---- CSV ----
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s)) s = `'${s}`; // spreadsheet formula-injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const line = (cells: unknown[]) => cells.map(csvCell).join(",");
const m = (minor: number) => toMajor(minor).toFixed(2);

export function reportToCsv(r: SalesReport, type: ReportType): string {
  const out: string[] = [];
  const s = r.summary;
  if (type === "sales") {
    out.push(line(["date", "orders", "gross", "discount", "shipping", "tax", "net", "currency"]));
    for (const d of r.daily) out.push(line([d.date, d.orders, m(d.gross_minor), m(d.discount_minor), m(d.shipping_minor), m(d.tax_minor), m(d.net_minor), r.currency]));
    out.push(line(["TOTAL", s.orders, m(s.gross_minor), m(s.discount_minor), m(s.shipping_minor), m(s.tax_minor), m(s.net_minor), r.currency]));
  } else if (type === "tax") {
    out.push(line(["date", "orders", "taxable", "tax", "currency"]));
    for (const d of r.daily) out.push(line([d.date, d.orders, m(d.gross_minor - d.discount_minor), m(d.tax_minor), r.currency]));
    out.push(line(["TOTAL", s.orders, m(s.gross_minor - s.discount_minor), m(s.tax_minor), r.currency]));
  } else {
    out.push(line(["product", "sku", "units", "revenue", "currency"]));
    for (const p of r.products) out.push(line([p.product_name, p.sku, p.quantity, m(p.revenue_minor), r.currency]));
  }
  return out.join("\n");
}

export function isReportType(v: unknown): v is ReportType {
  return typeof v === "string" && (REPORT_TYPES as readonly string[]).includes(v);
}
