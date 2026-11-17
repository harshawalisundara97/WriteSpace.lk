"use client";

import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { en, type MessageKey } from "@/lib/i18n/dictionaries";
import { setLocale } from "@/lib/i18n/actions";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;
const Ctx = createContext<{ locale: Locale; t: T }>({
  locale: DEFAULT_LOCALE,
  t: (k) => en[k],
});

/** Server passes only the active locale's merged messages (≈2 KB), not every dictionary. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Record<MessageKey, string>; children: ReactNode }) {
  const value = useMemo(() => ({
    locale,
    t: ((key, vars) => {
      const s = messages[key] ?? en[key];
      return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
    }) as T,
  }), [locale, messages]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

/** Compact language picker; persists via cookie and re-renders server content. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={className}>
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale} disabled={pending} aria-label={t("common.language")}
        onChange={(e) => { const next = e.target.value; start(async () => { await setLocale(next); router.refresh(); }); }}
        className="h-9 rounded-full border border-line bg-paper px-3 text-sm text-ink-soft outline-none hover:border-ink/30 focus:ring-2 focus:ring-brand/30"
      >
        {LOCALES.map((l) => <option key={l} value={l} lang={l}>{LOCALE_LABELS[l]}</option>)}
      </select>
    </label>
  );
}
