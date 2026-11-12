import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStoreSettings } from "@/lib/catalog/queries";
import { sendEnquiry } from "@/lib/email/enquiry";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Please add a subject").max(160),
  message: z.string().trim().min(10, "Please add a little more detail").max(5000),
  // Honeypot: real users leave this empty; bots tend to fill every field.
  company: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Please check the form and try again";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  const { company, phone, ...fields } = parsed.data;
  if (company) {
    // Honeypot tripped — pretend success without sending.
    return NextResponse.json({ ok: true });
  }

  const settings = await getStoreSettings();
  const res = await sendEnquiry(
    { ...fields, phone: phone || undefined },
    settings.support_email,
  );

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong sending your message. Please try again." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
