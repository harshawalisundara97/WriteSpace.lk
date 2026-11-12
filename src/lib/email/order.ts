import "server-only";
import { Resend } from "resend";
import { formatMoney } from "@/lib/pricing/money";

export type OrderEmailKind = "confirmation" | "shipped" | "refunded";

export interface OrderEmailData {
  to: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  items?: { name: string; quantity: number; lineTotalMinor: number }[];
  trackingNumber?: string | null;
  refundMinor?: number;
  storeName?: string;
}

const BRAND = "#4f46e5";
const ACCENT = "#ef5a4c";

// Branded, email-client-safe shell (inline styles, table layout).
function shell(title: string, body: string, store = "WriteSpace.lk"): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border:1px solid #ecebe7;border-radius:16px;overflow:hidden">
      <tr><td style="padding:22px 28px;border-bottom:1px solid #ecebe7">
        <span style="font-size:20px;font-weight:700;color:${BRAND}">WriteSpace<span style="color:${ACCENT}">.lk</span></span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 6px;font-size:22px">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #ecebe7;color:#8a8a8a;font-size:12px;text-align:center">
        © ${new Date().getFullYear()} ${store} — Stationery for kids &amp; adults, delivered across Sri Lanka.
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

function itemsTable(d: OrderEmailData): string {
  if (!d.items?.length) return "";
  const rows = d.items
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0efec">${i.quantity}× ${i.name}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #f0efec">${formatMoney(i.lineTotalMinor, d.currency)}</td></tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">${rows}</table>`;
}

function totalRow(label: string, minor: number, currency: string): string {
  return `<p style="text-align:right;margin:8px 0 0;font-size:16px"><strong>${label}: ${formatMoney(minor, currency)}</strong></p>`;
}

// Pure renderer — used both to send and to preview without sending.
export function renderOrderEmail(kind: OrderEmailKind, d: OrderEmailData): { subject: string; html: string } {
  const store = d.storeName ?? "WriteSpace.lk";
  switch (kind) {
    case "shipped": {
      const track = d.trackingNumber
        ? `<p style="margin:12px 0">Tracking number: <strong>${d.trackingNumber}</strong></p>`
        : "";
      return {
        subject: `Your WriteSpace.lk order ${d.orderNumber} has shipped`,
        html: shell("Your order is on its way! 📦", `
          <p style="margin:0 0 8px">Good news — order <strong>${d.orderNumber}</strong> has shipped.</p>
          ${track}
          ${itemsTable(d)}
          ${totalRow("Total", d.totalMinor, d.currency)}
          <p style="margin:16px 0 0;color:#6b6b6b">Thanks for shopping with us.</p>`, store),
      };
    }
    case "refunded": {
      const amount = d.refundMinor ?? d.totalMinor;
      return {
        subject: `Your WriteSpace.lk order ${d.orderNumber} — refund processed`,
        html: shell("Refund processed", `
          <p style="margin:0 0 8px">We've processed a refund for order <strong>${d.orderNumber}</strong>.</p>
          ${totalRow("Refunded", amount, d.currency)}
          <p style="margin:16px 0 0;color:#6b6b6b">It may take 5–10 business days to appear on your statement, depending on your bank.</p>`, store),
      };
    }
    case "confirmation":
    default:
      return {
        subject: `Your WriteSpace.lk order ${d.orderNumber}`,
        html: shell("Thanks for your order! 🎉", `
          <p style="margin:0 0 8px">Order <strong>${d.orderNumber}</strong> is confirmed.</p>
          ${itemsTable(d)}
          ${totalRow("Total", d.totalMinor, d.currency)}
          <p style="margin:16px 0 0;color:#6b6b6b">We'll email you again when it ships.</p>`, store),
      };
  }
}

// Sends via Resend when configured; otherwise logs and no-ops so local/dev
// flows (and the webhook) never fail just because email isn't set up.
async function send(kind: OrderEmailKind, d: OrderEmailData): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM ?? "WriteSpace.lk <orders@writespace.lk>";
  const { subject, html } = renderOrderEmail(kind, d);
  if (!key) {
    console.info(`[email] (skipped, no RESEND_API_KEY) ${kind} ${d.orderNumber} -> ${d.to}`);
    return;
  }
  try {
    await new Resend(key).emails.send({ from, to: d.to, subject, html });
  } catch (e) {
    console.error(`[email] failed to send ${kind} email`, e);
  }
}

export async function sendOrderConfirmation(d: OrderEmailData): Promise<void> {
  await send("confirmation", d);
}

export async function sendOrderShipped(d: OrderEmailData): Promise<void> {
  await send("shipped", d);
}

export async function sendOrderRefunded(d: OrderEmailData): Promise<void> {
  await send("refunded", d);
}
