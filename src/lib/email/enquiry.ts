import "server-only";
import { Resend } from "resend";

export interface EnquiryData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const BRAND = "#4f46e5";
const ACCENT = "#ef5a4c";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Branded, email-client-safe shell (inline styles, table layout) — mirrors
// lib/email/order.ts so staff enquiry mail matches the transactional look.
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
        © ${new Date().getFullYear()} ${store} — customer enquiry.
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

// Pure renderer — used to build the staff-facing enquiry email.
export function renderEnquiryEmail(d: EnquiryData): { subject: string; html: string } {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#8a8a8a;width:90px;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>`;
  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:4px 0 14px">
      ${row("From", esc(d.name))}
      ${row("Email", `<a href="mailto:${esc(d.email)}" style="color:${BRAND}">${esc(d.email)}</a>`)}
      ${d.phone ? row("Phone", esc(d.phone)) : ""}
      ${row("Subject", esc(d.subject))}
    </table>
    <div style="white-space:pre-wrap;border-top:1px solid #f0efec;padding-top:14px;font-size:14px;line-height:1.6">${esc(d.message)}</div>`;
  return { subject: `New enquiry: ${d.subject}`, html: shell("New customer enquiry", body) };
}

// Sends the enquiry to the store inbox via Resend when configured; otherwise
// logs and no-ops so demo/dev flows never fail just because email isn't set up.
// `replyTo` is the customer's address, so staff can reply directly.
export async function sendEnquiry(
  d: EnquiryData,
  inbox?: string | null,
): Promise<{ ok: boolean; delivered: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM ?? "WriteSpace.lk <orders@writespace.lk>";
  const to = process.env.CONTACT_INBOX ?? inbox ?? "";
  const { subject, html } = renderEnquiryEmail(d);

  if (!key || !to) {
    console.info(
      `[enquiry] (skipped, ${!key ? "no RESEND_API_KEY" : "no inbox"}) "${d.subject}" from ${d.email}`,
    );
    return { ok: true, delivered: false };
  }
  try {
    await new Resend(key).emails.send({ from, to, subject, html, replyTo: d.email });
    return { ok: true, delivered: true };
  } catch (e) {
    console.error("[enquiry] failed to send", e);
    return { ok: false, delivered: false };
  }
}
