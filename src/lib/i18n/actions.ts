"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "./config";

/** Persist the shopper's language choice for a year. */
export async function setLocale(locale: string): Promise<{ ok: boolean }> {
  if (!isLocale(locale)) return { ok: false };
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true };
}
