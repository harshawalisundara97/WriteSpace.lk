import "server-only";
import { formatMoney } from "@/lib/pricing/money";
import { shell } from "@/lib/email/order";
import { esc, sendEmail } from "@/lib/email/marketing";

// B2B quote emails — TASK-NEXT-009b (request received).

export interface QuoteRequestEmail {
  quoteNumber: string;
  contactName: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  notes?: string | null;
  items: { name: string; sku: string; qty: number; list_unit_minor: number }[];
  listSubtotalMinor: number;
  currency: string;
  adminUrl?: string;
}

function itemsTable(d: QuoteRequestEmail): string {
  const rows = d.items.map((i) =>
    `<tr><td style="padding:6px 0">${esc(i.name)}<br><span style="color:#8a8a8a;font-size:12px">${esc(i.sku)}</span></td>` +
    `<td style="padding:6px 0;text-align:right;white-space:nowrap">× ${i.qty.toLocaleString("en-LK")}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0;border-top:1px solid #f0efec">${rows}</table>
    <p style="font-size:13px;color:#8a8a8a;margin:0">At list prices this comes to ${formatMoney(d.listSubtotalMinor, d.currency)} before any bulk discount.</p>`;
}

export function renderQuoteReceived(d: QuoteRequestEmail): { subject: string; html: string } {
  const body = `<p style="font-size:14px;line-height:1.6">Hi ${esc(d.contactName.split(" ")[0])}, thanks — we've received your quote request
    <strong>${esc(d.quoteNumber)}</strong>. We'll reply with prices within one working day.</p>${itemsTable(d)}`;
  return { subject: `Quote request ${d.quoteNumber} received`, html: shell("We're preparing your quote", body) };
}

export function renderQuoteRequestStaff(d: QuoteRequestEmail): { subject: string; html: string } {
  const who = [d.contactName, d.company].filter(Boolean).map((s) => esc(s!)).join(" · ");
  const body = `<p style="font-size:14px;line-height:1.6"><strong>${who}</strong><br>
    <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>${d.phone ? ` · ${esc(d.phone)}` : ""}</p>
    ${d.notes ? `<div style="white-space:pre-wrap;font-size:14px;background:#f6f5f2;border-radius:8px;padding:10px 12px">${esc(d.notes)}</div>` : ""}
    ${itemsTable(d)}
    ${d.adminUrl ? `<p style="margin-top:18px"><a href="${esc(d.adminUrl)}" style="color:#4f46e5;font-weight:600">Price this quote →</a></p>` : ""}`;
  return { subject: `New quote request ${d.quoteNumber}${d.company ? ` — ${d.company}` : ""}`, html: shell("New quote request", body) };
}

export async function sendQuoteRequestEmails(d: QuoteRequestEmail, staffInbox: string | null): Promise<void> {
  await Promise.all([
    sendEmail(d.email, renderQuoteReceived(d)),
    staffInbox ? sendEmail(staffInbox, renderQuoteRequestStaff(d)) : Promise.resolve(true),
  ]).catch(() => {});
}

// ---- quote priced (TASK-NEXT-009c) ----
export interface QuotePricedEmail {
  to: string;
  contactName: string;
  quoteNumber: string;
  items: { name: string; sku: string; qty: number; unitMinor: number; listUnitMinor: number }[];
  shippingMinor: number;
  totalMinor: number;
  savingsMinor: number;
  validUntil: Date;
  url: string;
  currency?: string;
}

export function renderQuotePriced(d: QuotePricedEmail): { subject: string; html: string } {
  const cur = d.currency ?? "LKR";
  const rows = d.items.map((i) =>
    `<tr><td style="padding:6px 0">${esc(i.name)}<br><span style="color:#8a8a8a;font-size:12px">${i.qty.toLocaleString("en-LK")} × ${formatMoney(i.unitMinor, cur)}` +
    `${i.unitMinor < i.listUnitMinor ? ` <s>${formatMoney(i.listUnitMinor, cur)}</s>` : ""}</span></td>` +
    `<td style="padding:6px 0;text-align:right;white-space:nowrap">${formatMoney(i.qty * i.unitMinor, cur)}</td></tr>`).join("");
  const until = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(d.validUntil);
  const body = `<p style="font-size:14px;line-height:1.6">Hi ${esc(d.contactName.split(" ")[0])}, here are your prices for quote <strong>${esc(d.quoteNumber)}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0;border-top:1px solid #f0efec">${rows}
      ${d.shippingMinor > 0 ? `<tr><td style="padding:6px 0;color:#8a8a8a">Delivery</td><td style="padding:6px 0;text-align:right">${formatMoney(d.shippingMinor, cur)}</td></tr>` : ""}
      <tr><td style="padding:10px 0;border-top:1px solid #f0efec;font-weight:700">Total</td><td style="padding:10px 0;border-top:1px solid #f0efec;text-align:right;font-weight:700">${formatMoney(d.totalMinor, cur)}</td></tr>
    </table>
    ${d.savingsMinor > 0 ? `<p style="font-size:14px;color:#15803d;margin:0 0 12px">You save ${formatMoney(d.savingsMinor, cur)} on list prices.</p>` : ""}
    <p style="font-size:14px">These prices are held until <strong>${until}</strong>.</p>
    <p style="margin:18px 0"><a href="${esc(d.url)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">View your quote</a></p>`;
  return { subject: `Your quote ${d.quoteNumber} is ready`, html: shell("Your quote is ready", body) };
}

export async function sendQuotePriced(d: QuotePricedEmail): Promise<void> {
  await sendEmail(d.to, renderQuotePriced(d)).catch(() => {});
}

// ---- quote accepted (TASK-NEXT-009d) ----
export async function sendQuoteAcceptedStaff(to: string, d: { quoteNumber: string; buyer: string; totalMinor: number; poNumber: string | null; adminUrl: string }): Promise<void> {
  const body = `<p style="font-size:14px;line-height:1.6"><strong>${esc(d.buyer)}</strong> accepted quote <strong>${esc(d.quoteNumber)}</strong>
    for ${formatMoney(d.totalMinor, "LKR")}${d.poNumber ? ` (PO ${esc(d.poNumber)})` : ""}.</p>
    <p><a href="${esc(d.adminUrl)}" style="color:#4f46e5;font-weight:600">Convert to order →</a></p>`;
  await sendEmail(to, { subject: `Quote ${d.quoteNumber} accepted`, html: shell("Quote accepted", body) }).catch(() => {});
}
