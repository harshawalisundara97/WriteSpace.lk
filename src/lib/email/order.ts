import "server-only";
import { Resend } from "resend";
import { formatMoney } from "@/lib/pricing/money";

interface OrderEmailData {
  to: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  items: { name: string; quantity: number; lineTotalMinor: number }[];
}

// Sends via Resend when configured; otherwise logs and no-ops so local/dev
// flows (and the webhook) never fail just because email isn't set up.
export async function sendOrderConfirmation(d: OrderEmailData): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM ?? "WriteSpace.lk <orders@writespace.lk>";
  if (!key) {
    console.info(`[email] (skipped, no RESEND_API_KEY) order ${d.orderNumber} -> ${d.to}`);
    return;
  }
  const rows = d.items
    .map((i) => `<tr><td>${i.quantity}× ${i.name}</td><td align="right">${formatMoney(i.lineTotalMinor, d.currency)}</td></tr>`)
    .join("");
  try {
    await new Resend(key).emails.send({
      from,
      to: d.to,
      subject: `Your WriteSpace.lk order ${d.orderNumber}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
          <h2>Thanks for your order!</h2>
          <p>Order <strong>${d.orderNumber}</strong> is confirmed.</p>
          <table width="100%" cellpadding="6" style="border-collapse:collapse">${rows}</table>
          <hr/>
          <p style="text-align:right"><strong>Total: ${formatMoney(d.totalMinor, d.currency)}</strong></p>
          <p>We'll email you again when it ships.</p>
        </div>`,
    });
  } catch (e) {
    console.error("[email] failed to send order confirmation", e);
  }
}
