// hreflang + canonical per locale — TASK-NEXT-010c. Pure; see seo-server.ts for the request-aware wrapper.
// English lives at the bare path; other locales at `?lang=xx` (middleware applies it).
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, type Locale } from "./config";

export function localeUrl(path: string, locale: Locale): string {
  return locale === DEFAULT_LOCALE ? path : `${path}${path.includes("?") ? "&" : "?"}lang=${locale}`;
}

/** Self-referencing canonical for the rendered locale, plus every alternate and x-default. */
export function alternatesFor(path: string, locale: Locale): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_TAGS[l]] = localeUrl(path, l);
  languages["x-default"] = path;
  return { canonical: localeUrl(path, locale), languages };
}
