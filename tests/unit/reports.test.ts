import { describe, it, expect } from "vitest";
import { buildSalesReport, parseDateWindow, reportToCsv, windowBounds, csvCell, isReportType, type ReportOrder, type ReportItem } from "@/lib/admin/reports";

const o = (id: string, status: string, created_at: string, total = 10000, tax = 0): ReportOrder =>
  ({ id, status, created_at, currency: "LKR", subtotal_minor: total - tax, discount_minor: 0, shipping_minor: 0, tax_minor: tax, total_minor: total });
const w = { from: "2026-11-01", to: "2026-11-03" };

describe("parseDateWindow", () => {
  const now = Date.parse("2026-11-16T10:00:00Z");
  it("defaults to last 30 days", () => expect(parseDateWindow(null, null, now)).toEqual({ from: "2026-10-18", to: "2026-11-16" }));
  it("swaps reversed ranges", () => expect(parseDateWindow("2026-11-10", "2026-11-01", now)).toEqual({ from: "2026-11-01", to: "2026-11-10" }));
  it("rejects junk input", () => expect(parseDateWindow("x';drop", "2026-13-99", now).to).toBe("2026-11-16"));
  it("caps span at 366 days", () => expect(parseDateWindow("2020-01-01", "2026-11-16", now).from).toBe("2025-11-16"));
  it("windowBounds is half-open", () => expect(windowBounds(w)).toEqual({ start: "2026-11-01T00:00:00.000Z", end: "2026-11-04T00:00:00.000Z" }));
});

describe("buildSalesReport", () => {
  const orders = [
    o("a", "paid", "2026-11-01T08:00:00Z", 10000, 1000),
    o("b", "delivered", "2026-11-03T23:59:00Z", 5000),
    o("c", "pending_payment", "2026-11-02T08:00:00Z", 99999),
    o("d", "cancelled", "2026-11-02T08:00:00Z", 99999),
    o("e", "paid", "2026-11-04T00:00:00Z", 77777),
  ];
  const items: ReportItem[] = [
    { order_id: "a", product_name: "Pen", sku: "P1", quantity: 2, line_total_minor: 6000 },
    { order_id: "b", product_name: "Pen", sku: "P1", quantity: 1, line_total_minor: 3000 },
    { order_id: "a", product_name: "Book", sku: "B1", quantity: 1, line_total_minor: 3000 },
    { order_id: "c", product_name: "Ghost", sku: "G", quantity: 9, line_total_minor: 99999 },
  ];
  const r = buildSalesReport(orders, items, w);
  it("counts only paid statuses inside the window", () => {
    expect(r.summary).toMatchObject({ orders: 2, net_minor: 15000, tax_minor: 1000, aov_minor: 7500, units: 4 });
  });
  it("emits one row per day including empty days", () => {
    expect(r.daily.map((d) => [d.date, d.orders])).toEqual([["2026-11-01", 1], ["2026-11-02", 0], ["2026-11-03", 1]]);
  });
  it("aggregates products by sku, sorted by revenue", () => {
    expect(r.products).toEqual([
      { product_name: "Pen", sku: "P1", quantity: 3, revenue_minor: 9000 },
      { product_name: "Book", sku: "B1", quantity: 1, revenue_minor: 3000 },
    ]);
  });
  it("handles empty input", () => expect(buildSalesReport([], [], w).summary.aov_minor).toBe(0));
});

describe("CSV", () => {
  const r = buildSalesReport([o("a", "paid", "2026-11-01T08:00:00Z", 12345, 345)], [{ order_id: "a", product_name: 'Pen, "Blue"', sku: "P1", quantity: 1, line_total_minor: 12000 }], w);
  it("sales csv uses major units and a total row", () => {
    const lines = reportToCsv(r, "sales").split("\n");
    expect(lines[0]).toBe("date,orders,gross,discount,shipping,tax,net,currency");
    expect(lines[1]).toBe("2026-11-01,1,120.00,0.00,0.00,3.45,123.45,LKR");
    expect(lines.at(-1)).toBe("TOTAL,1,120.00,0.00,0.00,3.45,123.45,LKR");
  });
  it("tax csv", () => expect(reportToCsv(r, "tax").split("\n")[1]).toBe("2026-11-01,1,120.00,3.45,LKR"));
  it("products csv quotes commas/quotes", () => expect(reportToCsv(r, "products").split("\n")[1]).toBe('"Pen, ""Blue""",P1,1,120.00,LKR'));
  it("guards formula injection but keeps negatives", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-12.00")).toBe("-12.00");
  });
  it("isReportType", () => { expect(isReportType("tax")).toBe(true); expect(isReportType("users")).toBe(false); });
});
