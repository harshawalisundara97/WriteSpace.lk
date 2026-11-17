import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { cleanLine, parseBookList, scoreMatch, rankCandidates, searchTerms, reviewToCartItems, reviewSubtotalMinor } from "@/lib/booklist/match";
import { matchBookList } from "@/lib/booklist/actions";

describe("cleanLine", () => {
  it("strips bullets and numbering", () => {
    expect(cleanLine("1. A5 dotted notebook")).toEqual({ name: "A5 dotted notebook", quantity: 1 });
    expect(cleanLine("- Gel pens")).toEqual({ name: "Gel pens", quantity: 1 });
    expect(cleanLine("• Crayons")).toEqual({ name: "Crayons", quantity: 1 });
    expect(cleanLine("3) Watercolour set")).toEqual({ name: "Watercolour set", quantity: 1 });
  });
  it("reads quantities", () => {
    expect(cleanLine("CR books x3")).toEqual({ name: "CR books", quantity: 3 });
    expect(cleanLine("CR books - 4 nos")).toEqual({ name: "CR books", quantity: 4 });
    expect(cleanLine("2 x Gel pens")).toEqual({ name: "Gel pens", quantity: 2 });
    expect(cleanLine("Exercise books (80 pages) 6 pcs")).toEqual({ name: "Exercise books (80 pages)", quantity: 6 });
    expect(cleanLine("5 Pencils")).toEqual({ name: "Pencils", quantity: 5 });
  });
  it("keeps numbers that are part of the name", () => {
    expect(cleanLine("Crayons 24")).toEqual({ name: "Crayons 24", quantity: 1 });
    expect(cleanLine("A4 ruled book")).toEqual({ name: "A4 ruled book", quantity: 1 });
  });
  it("caps quantity", () => {
    expect(cleanLine("Pens x5000").quantity).toBe(99);
  });
});

describe("parseBookList", () => {
  it("skips blanks and headings", () => {
    const lines = parseBookList("Grade 3 Book List:\n\n1. Gel pens x2\n2. Crayons\n   \n");
    expect(lines.map((l) => l.name)).toEqual(["Gel pens", "Crayons"]);
    expect(lines[0]).toMatchObject({ index: 0, raw: "1. Gel pens x2", quantity: 2 });
  });
  it("caps line count", () => {
    expect(parseBookList(Array.from({ length: 150 }, (_, i) => `item ${i}`).join("\n"))).toHaveLength(100);
  });
});

describe("scoring", () => {
  const gel = { name: "Rainbow Gel Pens (12-pack)", brand: "DooWrite" };
  it("scores a good match high", () => {
    expect(scoreMatch("gel pens", gel)).toBeGreaterThanOrEqual(0.6);
  });
  it("tolerates spacing variants and plurals", () => {
    expect(scoreMatch("water colour set", { name: "Watercolour Paint Set (24)", brand: "ArtLab" })).toBeGreaterThan(0.4);
    expect(scoreMatch("crayon", { name: "Jumbo Crayons (24)", brand: "DooWrite" })).toBeGreaterThan(0.5);
  });
  it("scores unrelated low", () => {
    expect(scoreMatch("calculator", gel)).toBeLessThan(0.3);
  });
  it("ranks candidates", () => {
    const ranked = rankCandidates("dotted notebook", [
      { id: "a", name: "Classic Fountain Pen", brand: "Inkwell" },
      { id: "b", name: "A5 Dotted Notebook", brand: "PaperCo" },
    ]);
    expect(ranked[0].product.id).toBe("b");
  });
  it("search terms drop stopwords and short tokens", () => {
    expect(searchTerms("Exercise books (80 pages) for the class")).toEqual(["exercise", "books", "pages", "class"]);
  });
});

describe("matchBookList (demo mode)", () => {
  it("matches demo products and flags unmatched", async () => {
    const res = await matchBookList("1. Gel pens x2\n2. crayons\n3. dotted notebook\n4. scientific calculator");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [g, c, n, calc] = res.lines;
    expect(g.best?.product.slug).toBe("rainbow-gel-pens-12");
    expect(g.quantity).toBe(2);
    expect(c.best?.product.slug).toBe("jumbo-crayons-24");
    expect(n.best?.product.slug).toBe("a5-dotted-notebook");
    expect(calc.best).toBeNull();
    expect(calc.status).toBe("unmatched");
    expect(n.best?.product.variants.map((v) => v.id)).toEqual(["p3-v0", "p3-v1"]);
    expect(n.best?.product.variants[1]).toMatchObject({ priceMinor: 150000, currency: "LKR", available: 3 });
  });
  it("rejects empty input", async () => {
    expect((await matchBookList("   ")).ok).toBe(false);
  });
});

describe("review → cart", () => {
  const rows = [
    { variantId: "a", quantity: 2, include: true, unitMinor: 100 },
    { variantId: "a", quantity: 3, include: true, unitMinor: 100 },
    { variantId: "b", quantity: 1, include: false, unitMinor: 500 },
    { variantId: null, quantity: 4, include: true },
    { variantId: "c", quantity: 500, include: true, unitMinor: 10 },
  ];
  it("merges, skips excluded/unmatched, clamps", () => {
    expect(reviewToCartItems(rows)).toEqual([{ variantId: "a", quantity: 5 }, { variantId: "c", quantity: 99 }]);
  });
  it("subtotals included rows", () => {
    expect(reviewSubtotalMinor(rows)).toBe(500 + 990);
  });
});
