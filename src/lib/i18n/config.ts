// Storefront i18n — TASK-NEXT-010a. Locale is a cookie (no URL prefix in v1);
// `?lang=si` also selects it so hreflang alternates are crawlable (010c).
export const LOCALES = ["en", "si", "ta"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ws_locale";

export const LOCALE_LABELS: Record<Locale, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };
/** BCP 47 tags for <html lang> / hreflang / OpenGraph. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en-LK", si: "si-LK", ta: "ta-LK" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Pick a locale: explicit (query/cookie) first, then Accept-Language, else English. */
export function resolveLocale(explicit: string | null | undefined, acceptLanguage?: string | null): Locale {
  if (isLocale(explicit)) return explicit;
  const prefs = (acceptLanguage ?? "")
    .split(",")
    .map((p) => {
      const [tag, ...params] = p.trim().toLowerCase().split(";");
      const q = params.find((x) => x.trim().startsWith("q="));
      return { base: tag.split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.base)
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) if (p.q > 0 && isLocale(p.base)) return p.base;
  return DEFAULT_LOCALE;
}
