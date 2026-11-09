"use server";

import { z } from "zod";

const schema = z.object({ email: z.string().email() });

// Acknowledges the signup. Wire up persistence (a newsletter_subscribers table
// or an email provider's audience) when you connect your backend/ESP.
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse({ email });
  if (!parsed.success) return { ok: false, error: "Please enter a valid email" };
  return { ok: true };
}
