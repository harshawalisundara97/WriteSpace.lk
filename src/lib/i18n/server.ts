import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";

/** Current storefront locale from cookie, then Accept-Language. */
export async function getLocale(): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}
