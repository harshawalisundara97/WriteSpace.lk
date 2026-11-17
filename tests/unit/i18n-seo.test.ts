import { describe, it, expect } from "vitest";
import { alternatesFor, localeUrl } from "@/lib/i18n/seo";

describe("locale URLs", () => {
  it("keeps English bare and appends ?lang for others", () => {
    expect(localeUrl("/about", "en")).toBe("/about");
    expect(localeUrl("/about", "si")).toBe("/about?lang=si");
    expect(localeUrl("/products?page=2", "ta")).toBe("/products?page=2&lang=ta");
  });
});

describe("alternatesFor", () => {
  it("self-references the rendered locale and lists every alternate + x-default", () => {
    expect(alternatesFor("/c/pens", "si")).toEqual({
      canonical: "/c/pens?lang=si",
      languages: { "en-LK": "/c/pens", "si-LK": "/c/pens?lang=si", "ta-LK": "/c/pens?lang=ta", "x-default": "/c/pens" },
    });
    expect(alternatesFor("/", "en").canonical).toBe("/");
  });
});
