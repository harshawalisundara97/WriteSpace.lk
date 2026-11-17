import "server-only";
import { Resend } from "resend";
import { formatMoney } from "@/lib/pricing/money";
import { shell } from "@/lib/email/order";

// Back-in-stock (TASK-NEXT-005) and abandoned-cart (TASK-NEXT-006) emails.

const BTN = "display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export interface BackInStockEmail { productName: string; variantName: string | null; url: string }

export function renderBackInStock(d: BackInStockEmail): { subject: string; html: string } {
  const name = d.variantName ? `${d.productName} (${d.variantName})` : d.productName;
  return {
    subject: `Back in stock: ${d.productName}`,
    html: shell("It's back! ✏️", `
      <p style="margin:0 0 16px"><strong>${esc(name)}</strong> is back in stock at WriteSpace.lk.</p>
      <p style="margin:0 0 20px;color:#6b6b6b">Stock is limited, so grab it before it goes again.</p>
      <p style="margin:0"><a href="${esc(d.url)}" style="${BTN}">Shop now</a></p>
      <p style="margin:20px 0 0;color:#8a8a8a;font-size:12px">You asked us to tell you when this item was available. This is a one-time email.</p>`),
  };
}

export interface CartReminderEmail {
  firstName: string | null;
  items: { name: string; quantity: number; unitMinor: number }[];
  currency: string;
  cartUrl: string;
  unsubscribeUrl: string;
}

export function renderCartReminder(d: CartReminderEmail): { subject: string; html: string } {
  const shown = d.items.slice(0, 5);
  const more = d.items.length - shown.length;
  const rows = shown
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0efec">${i.quantity}× ${esc(i.name)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #f0efec">${formatMoney(i.unitMinor * i.quantity, d.currency)}</td></tr>`)
    .join("");
  return {
    subject: "You left something in your cart",
    html: shell(`${d.firstName ? `Hi ${esc(d.firstName)}, your` : "Your"} cart is waiting`, `
      <p style="margin:0 0 8px">You left these in your WriteSpace.lk cart:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;font-size:14px">${rows}</table>
      ${more > 0 ? `<p style="margin:0 0 12px;color:#6b6b6b;font-size:13px">+ ${more} more item${more === 1 ? "" : "s"}</p>` : ""}
      <p style="margin:16px 0 0"><a href="${esc(d.cartUrl)}" style="${BTN}">Back to my cart</a></p>
      <p style="margin:20px 0 0;color:#8a8a8a;font-size:12px">Prices and stock are confirmed at checkout. <a href="${esc(d.unsubscribeUrl)}" style="color:#8a8a8a">Stop cart reminders</a>.</p>`),
  };
}

/** Send via Resend when configured; otherwise log. Returns true when handed to Resend (or skipped in dev). */
export async function sendEmail(to: string, msg: { subject: string; html: string }, headers?: Record<string, string>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM ?? "WriteSpace.lk <orders@writespace.lk>";
  if (!key) {
    console.info(`[email] (skipped, no RESEND_API_KEY) "${msg.subject}" -> ${to}`);
    return true;
  }
  try {
    const { error } = await new Resend(key).emails.send({ from, to, subject: msg.subject, html: msg.html, headers });
    if (error) { console.error("[email] send failed", error); return false; }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
