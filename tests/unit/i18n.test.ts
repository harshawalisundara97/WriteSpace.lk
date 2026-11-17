import { describe, it, expect } from "vitest";
import { resolveLocale, isLocale } from "@/lib/i18n/config";
import { en, si, ta, translate, messagesFor } from "@/lib/i18n/dictionaries";

describe("locale resolution", () => {
  it("prefers an explicit valid locale", () => {
    expect(resolveLocale("ta", "si")).toBe("ta");
    expect(resolveLocale("fr", "si-LK,en;q=0.5")).toBe("si");
  });
  it("honours Accept-Language q-values", () => {
    expect(resolveLocale(null, "en;q=0.4, ta-LK;q=0.9")).toBe("ta");
    expect(resolveLocale(null, "fr, de")).toBe("en");
    expect(resolveLocale(null, "si;q=0")).toBe("en");
  });
  it("validates locales", () => {
    expect(isLocale("si")).toBe(true);
    expect(isLocale("SI")).toBe(false);
  });
});

describe("dictionaries", () => {
  it("only use known keys", () => {
    for (const d of [si, ta]) for (const k of Object.keys(d)) expect(k in en).toBe(true);
  });
  it("cover every English key", () => {
    expect(Object.keys(si).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(ta).sort()).toEqual(Object.keys(en).sort());
  });
  it("keep the same {placeholders} as English", () => {
    const ph = (x: string) => (x.match(/\{\w+\}/g) ?? []).sort().join();
    for (const d of [si, ta]) for (const [k, v] of Object.entries(d)) expect(ph(v!), k).toBe(ph(en[k as keyof typeof en]));
  });
  it("translates with fallback and vars", () => {
    expect(translate("si", "nav.cart")).toBe("කරත්තය");
    expect(messagesFor("ta")["footer.shop"]).toBe("கடை");
    expect(translate("si", "cart.add", { name: "Pen" })).toBe("Pen එක් කරන්න");
    expect(translate("en", "nav.cart", { x: 1 })).toBe("Cart");
  });
});
