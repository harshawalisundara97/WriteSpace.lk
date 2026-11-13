# Customer E-commerce — Implementation Plan

Task-by-task roadmap for remaining **customer-facing** work. One task per
conversation. The core storefront (home, catalog, search, filters, PDP, cart,
guest checkout, payments, account, order tracking, reviews, wishlist,
loading/error/404) already exists — see [PROJECT_MAP.md](PROJECT_MAP.md).

Status legend: ☐ pending · ◐ in progress · ☑ completed.

## Tasks

| ID | Objective | Depends on | Status |
|---|---|---|---|
| TASK-001 | Content-page shell + policy pages (Shipping, Returns & Refunds, Privacy, Terms) + footer links | — | ☑ |
| TASK-002 | About page | 001 | ☑ |
| TASK-003 | Contact page + enquiry form (Resend) | 001 | ☑ |
| TASK-004 | FAQ page (stationery-focused) | 001 | ☑ |
| TASK-005 | Stationery product specifications (GSM, paper size, ruling, sheet count, colour) — schema + PDP spec table | — | ☑ |
| TASK-006 | Spec-based catalog filters for the new attributes | 005 | ☑ |
| TASK-007 | Bundles & school packs (curated / grade packs) | 005 | ☑ |
| TASK-008 | Bulk ordering (tiered pricing + bulk qty UI) | 005 | ☑ |
| TASK-009 | Delivery method selection at checkout (standard / express / pickup) | — | ☑ |
| TASK-010 | Saved delivery address book in account | 009 | ☑ |

---

## TASK-001 — Content shell + policy pages ☑

**Objective:** Add a reusable content-page layout and the four static policy
pages, linked from the footer on every page.

**Files added**
- `src/components/store/content-page.tsx` — `ContentPage` / `ContentSection` / `ContentList`.
- `src/app/shipping/page.tsx`, `src/app/returns/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`.

**Files modified**
- `src/components/store/site-footer.tsx` — legal nav (Shipping · Returns & Refunds · Privacy · Terms) in the bottom bar.

**Acceptance criteria** (all met)
- `/shipping`, `/returns`, `/privacy`, `/terms` render with storefront chrome and consistent typography.
- Footer links to all four pages on every storefront page.
- Per-page metadata (title template + description + canonical).

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; all four routes prerendered static (○).
- Browser check: `/returns` renders, title `Returns & refunds · WriteSpace.lk`, four footer links resolve, no console errors.

**Notes**
- Pages are static (no data fetch). Contact details in the footer come from store settings; a dedicated Contact page with a form is TASK-003.

**Commit:** `2c31aba`


---

## TASK-002 — About page ☑

**Objective:** Add a static About page using the TASK-001 content shell, linked
from the footer on every page.

**Files added**
- `src/app/about/page.tsx` — About page (`ContentPage` + sections: Who we are, What we stand for, Delivered across Sri Lanka, Browse & get in touch).

**Files modified**
- `src/components/store/site-footer.tsx` — added `About` to the bottom-bar nav (relabelled `aria-label` from `Legal` to `Footer` since it now holds About + legal links).

**Acceptance criteria** (all met)
- `/about` renders with storefront chrome and consistent typography.
- Footer links to `/about` on every storefront page.
- Per-page metadata (title template + description + canonical `/about`).

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/about` prerendered static (○).
- Browser check: `/about` renders, title `About us · WriteSpace.lk`, footer About link resolves, content + internal links present. (A hydration notice seen in the already-running dev server was stale SSR from a long-lived dev process that had not reloaded the footer edit — not present in the production build; a dev restart clears it.)

**Notes**
- Static page, no data fetch. Contact CTA points to the footer details; the dedicated Contact page with a form is TASK-003.

**Commit:** `2d8518d`


---

## TASK-003 — Contact page + enquiry form ☑

**Objective:** Add a `/contact` page using the TASK-001 content shell — store
contact details + a customer enquiry form that emails the store inbox via
Resend — linked from the footer on every page.

**Files added**
- `src/lib/email/enquiry.ts` — `renderEnquiryEmail` (pure renderer) + `sendEnquiry`; mirrors `lib/email/order.ts`. Sends to the store inbox with the customer as `replyTo`; no-ops (logs) when `RESEND_API_KEY` or inbox is absent. Inbox = `CONTACT_INBOX` env ?? store `support_email`.
- `src/app/api/contact/route.ts` — `POST` handler; zod-validated (name/email/subject/message, optional phone) + a `company` honeypot field; sends via `sendEnquiry`.
- `src/components/store/contact-form.tsx` — client form (`"use client"`) posting to `/api/contact`; inline errors + a success state; hidden honeypot.
- `src/app/contact/page.tsx` — Contact page (`ContentPage` + "Reach us directly" cards from `getStoreSettings`, email/phone/WhatsApp/address + the form).

**Files modified**
- `src/components/store/site-footer.tsx` — added `Contact` to the bottom-bar nav (between About and Shipping).

**Acceptance criteria** (all met)
- `/contact` renders with storefront chrome and consistent typography; contact-detail cards populate from store settings.
- Enquiry form validates and submits to `/api/contact`; success state shown; email delivered via Resend when configured, no-op (logged) otherwise.
- Footer links to `/contact` on every storefront page.
- Per-page metadata (title template + description + canonical `/contact`).

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/contact` prerendered static (○), `/api/contact` a dynamic function (ƒ).
- Browser check (fresh dev server + clean tab): `/contact` renders, title `Contact us · WriteSpace.lk`, detail cards present, footer Contact link in SSR HTML, no console errors. Submitting the form → `POST /api/contact 200 OK`, success message shown, server logged `[enquiry] (skipped, no RESEND_API_KEY) …` (demo-mode no-op). (Hydration notices seen earlier were stale console-buffer from the pre-edit long-lived dev server — gone on a fresh tab/server; the clean prod build confirms.)

**Notes**
- Demo mode: no email is sent (no key); the API still returns success and logs the enquiry. Set `RESEND_API_KEY` + `ORDER_EMAIL_FROM` (reused as the `from`) to deliver; optional `CONTACT_INBOX` overrides the store `support_email` as the destination.
- Spam guard is a honeypot field only (no rate limiting yet).

**Commit:** _pending_



---

## TASK-004 — FAQ page ☑

**Objective:** Add a stationery-focused `/faq` page using the TASK-001 content
shell — grouped question/answer sections covering orders & payment, stationery
products (GSM, paper sizes, ruling, refills), delivery and returns — linked from
the footer on every page.

**Files added**
- `src/app/faq/page.tsx` — FAQ page (`ContentPage` + four `ContentSection`s; a local `FaqList` renders each Q/A as a `<dl>` with cross-links to `/register`, `/contact`, `/account/orders`, `/products`, `/shipping`, `/returns`).

**Files modified**
- `src/components/store/site-footer.tsx` — added `FAQ` to the bottom-bar nav (between Contact and Shipping).

**Acceptance criteria** (all met)
- `/faq` renders with storefront chrome and consistent typography.
- Footer links to `/faq` on every storefront page.
- Per-page metadata (title template + description + canonical `/faq`).

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/faq` prerendered static (○).
- Browser check: `/faq` renders, title `FAQ · WriteSpace.lk`, all four sections + internal links present. (The only console error was a footer hydration mismatch — server HTML showed the pre-edit footer, `-/shipping` vs `+/faq` — from the long-lived dev server that had not recompiled the footer edit; not present in the clean production build. Same stale-dev-process artifact noted in TASK-002/003; a dev restart clears it.)

**Notes**
- Static page, no data fetch. Content is editorial (hardcoded Q/A); no FAQPage JSON-LD added yet.

**Commit:** _pending_



---

## TASK-005 — Stationery product specifications ☑

**Objective:** Add product-level stationery specs (GSM, paper size, ruling,
sheet count, colour) to the catalog — schema + admin editing + a PDP spec table —
as the data foundation for TASK-006 (spec-based filters).

**Design:** specs live in one keyed `jsonb` column on `products` (`specs`),
matching the existing `images`/`options` jsonb pattern — extensible for future
stationery attributes without per-attribute schema churn. The field set, labels,
input kinds and display formatting are defined once in `src/lib/catalog/specs.ts`
and shared by the PDP, the admin form, and (next) the filters.

**Files added**
- `src/lib/catalog/specs.ts` — `ProductSpecs` type, `SpecKey`, `SPEC_FIELDS` (key/label/kind/options/suffix), `specEntries()` (ordered display-ready `[label,value]` pairs, empties skipped) and `hasSpecs()`.
- `supabase/migrations/0007_product_specs.sql` — `alter table products add column if not exists specs jsonb not null default '{}'::jsonb`.

**Files modified**
- `src/lib/types.ts` — `Product.specs: ProductSpecs`; re-exports `ProductSpecs`.
- `src/lib/catalog/queries.ts` — `specs` added to `PRODUCT_SELECT` and the two `searchProducts` selects.
- `src/lib/admin/catalog-queries.ts` — `specs` added to the admin `SELECT`.
- `src/lib/validation/product.ts` — `specs` object added to `productSchema` (gsm/sheet_count ints, paper_size/ruling/colour strings, all optional, defaults `{}`).
- `src/lib/admin/product-actions.ts` — `saveProduct` persists `specs` on the product row.
- `src/components/admin/product-form.tsx` — a Specifications section (inputs generated from `SPEC_FIELDS`: number/text/select); submit builds a cleaned `specs` payload (empties dropped, numbers coerced).
- `src/app/products/[slug]/page.tsx` — a Specifications `<dl>` table under the description, rendered only when `specEntries(product.specs)` is non-empty.
- `src/lib/demo/data.ts` — `product()` helper takes an optional `spec`; the A5 Dotted Notebook carries `{gsm:160, paper_size:"A5", ruling:"Dotted", sheet_count:160}` so the PDP table is viewable in demo mode.
- `supabase/seed.sql` + `supabase/setup.sql` — `specs` column added to the products DDL (setup) and the dotted-notebook seed row (both), keeping the three schema copies in step.

**Acceptance criteria** (all met)
- Products have a product-level `specs` jsonb; admins can set GSM, paper size, ruling, sheet count and colour from the product form.
- The PDP shows a spec table of the set attributes (formatted, e.g. `160 gsm`, `160 sheets`), and hides it entirely when none are set.
- Schema is in step across `migrations/*`, `seed.sql` and `setup.sql`; demo mode renders the table without a backend.

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/products/[slug]` builds as a dynamic/ISR function (ƒ).
- Browser check (demo mode): `/products/a5-dotted-notebook` renders the Specifications table — GSM 160 gsm · Paper size A5 · Ruling Dotted · Sheets 160 sheets — no console errors; `/products/rainbow-gel-pens-12` (no specs) omits the table.

**Notes**
- Spec `colour` is a product-level attribute, distinct from per-variant colour (the demo notebook leaves it unset since colour is a variant option there).
- No spec-based catalog filters yet — that is TASK-006, which builds on `SPEC_FIELDS` and the `specs` column.

**Commit:** _pending_



---

## TASK-006 — Spec-based catalog filters ☑

**Objective:** Let customers filter the catalog by the TASK-005 stationery
specs (GSM, paper size, ruling, sheet count, colour), reusing the existing
faceted-filter UI and the `SPEC_FIELDS` single source of truth.

**Design:** each spec is a multi-select facet (like Brand): `computeFacets`
collects the distinct values present per spec key with counts, and the sidebar
renders one checkbox group per spec that has any values. One URL param per spec
key (`?paper_size=A5&ruling=Dotted,Plain` — comma-separated, OR within a key,
AND across keys). Spec values live on the already-selected `specs` jsonb, so
filtering is a client-side refine alongside colour/price/in-stock (no extra
query). No param collisions: spec `colour` vs variant `colours` are distinct.

**Files modified**
- `src/lib/catalog/specs.ts` — added `specFilterLabel(key, value)` (single-value display label, reuses the private `formatSpec`) for facet options + active chips.
- `src/lib/catalog/queries.ts` — `CatalogFilters.specs?: Partial<Record<SpecKey, string[]>>`; shared `matchSpecs()` helper applied in both the demo and Supabase (client-refine) paths; `SpecFacet` type + `Facets.specs`; `computeFacets` builds per-spec value counts, sorted (numeric for number kinds, option order for selects, alpha for text).
- `src/components/store/catalog-filters.tsx` — a checkbox group per `facets.specs` entry; spec selections folded into the active-filter chips and the active-count badge.
- `src/app/products/page.tsx` + `src/app/c/[category]/page.tsx` — parse a `specs` object from `searchParams` (looping `SPEC_FIELDS`) and pass it to `getProducts`.

**Acceptance criteria** (all met)
- Catalog (`/products` and `/c/[category]`) shows a checkbox facet per spec that has values, with per-value counts; selecting narrows the grid; selections appear as removable chips + in the filter count.
- Facet counts reflect the browse context (category + age), like the existing facets; empty specs never appear.
- One source of truth: labels/options/formatting come from `SPEC_FIELDS` / `specFilterLabel`, so adding a spec field needs no filter changes.

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/products` and `/c/[category]` build as dynamic functions (ƒ).
- Browser check (demo mode): `/products` shows GSM / Paper size / Ruling / Sheets facet groups (colour unset on demo data). `?paper_size=A5` and `?gsm=160` each narrow 6 → 1 item; clicking the Ruling → Dotted checkbox sets `?ruling=Dotted`, narrows to 1 item, adds a “Dotted” active chip + count badge, with the suffix in chips/options (`160 gsm`, `160 sheets`). No console errors.

**Notes**
- Demo data only has specs on the A5 Dotted Notebook, so each facet value shows count 1 and a selection narrows to that one product; with a real catalog the facets populate across products. No demo products were given fabricated paper specs.
- Number specs (GSM, sheet count) are discrete-value facets, not range sliders — natural for common stationery weights/counts and uniform with the other specs.

**Commit:** _pending_



---

## TASK-007 — Bundles & school packs ☑

**Objective:** Let customers browse curated stationery bundles / grade-based
school packs and add every item of a pack to the cart in one click, at an
optional curated price.

**Design:** a bundle is a first-class catalog object (mirrors the `collections`
pattern) — a `bundles` row + a `bundle_items` join that references existing
products (and a specific variant) with a per-item quantity. Price is the
optional `bundle_price_minor`, else the sum of item prices; the saving is the
difference. `bundlePricing()` is the single source for items-total / price /
saving, used by the card, the detail summary and the (future) admin UI. “Add
all” adds every resolved variant at its quantity via one `addManyToCart` server
action (stock-checked per variant, duplicates merged). Admin CRUD for bundles is
deferred (collections have no admin UI either); bundles are seeded in demo data
and the SQL, and managed by SQL for now.

**Files added**
- `src/lib/catalog/bundles.ts` — `getBundles` / `getBundleBySlug` / `getBundleSlugs` (demo + Supabase nested select), `itemVariant()`, `bundlePricing()` + `BundlePricing`.
- `src/components/store/bundle-card.tsx` — listing card (grade badge, item count, price + strike-through items-total + “Save”).
- `src/components/store/bundle-add.tsx` — client “Add all to cart” button (fly-to-cart + added state; surfaces skipped/out-of-stock and demo-mode messages).
- `src/app/bundles/page.tsx` — listing page (grid of `BundleCard`, metadata + canonical).
- `src/app/bundles/[slug]/page.tsx` — detail page (included-items list with per-item line totals + a sticky summary card: items total, saving, bundle price, Add-all).
- `supabase/migrations/0008_bundles.sql` — `bundles` + `bundle_items` tables, indexes, RLS (public reads published; `products:write` manages).

**Files modified**
- `src/lib/types.ts` — `Bundle`, `BundleItem`, `BundleWithItems`.
- `src/lib/cart/actions.ts` — `addManyToCart(items)` (merge + per-variant stock check + single revalidate).
- `src/components/cart/cart-provider.tsx` — `addMany` on the cart context.
- `src/components/store/header.tsx` — “School packs” → `/bundles` in the desktop + mobile nav.
- `src/components/store/site-footer.tsx` — “School packs” in the Shop column.
- `src/app/sitemap.ts` — `/bundles` + each bundle detail URL.
- `src/lib/demo/data.ts` — `demoBundles()` / `demoBundleBySlug()` (three packs built from existing demo products).
- `supabase/seed.sql` + `supabase/setup.sql` — bundle + bundle_items seed (setup also carries the `0008_bundles` tables/RLS), keeping the three schema copies in step.

**Acceptance criteria** (all met)
- `/bundles` lists each published bundle (grade badge, item count, price, saving); `/bundles/[slug]` shows the included items with quantities + per-item line totals and a summary (items total, saving, bundle price).
- “Add all to cart” adds every bundle item at its quantity in one action; demo mode shows the cart-disabled message, as single add does.
- Curated price shows the saving vs the items total; a bundle with no curated price shows no saving and price == items total.
- Linked from the header + footer; included in the sitemap; schema in step across `migrations/*`, `seed.sql` and `setup.sql`; demo mode renders without a backend.

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/bundles` prerendered static (○), `/bundles/[slug]` a dynamic function (ƒ).
- Browser check (demo mode): `/bundles` lists all three packs with correct prices/savings (Grade 1–3 — Save LKR 500.00, items LKR 5,090 → LKR 4,590; Office — Save LKR 860.00); `/bundles/grade-1-3-starter-pack` shows the 5-item breakdown + summary; `/bundles/little-artist-pack` (no curated price) shows no saving and total == price; “Add all” shows “Demo mode — connect Supabase”. Header/footer “School packs” links resolve. (The only console error was the known stale-dev-process hydration mismatch on the newly added header link — server HTML showed the pre-edit header — not present in the clean production build; same artifact noted in TASK-002/003/004, cleared by a dev restart.)

**Notes**
- Admin CRUD for bundles is deferred (SQL-managed for now), as a focused customer-facing follow-up.
- `addManyToCart` skips (rather than fails) out-of-stock items and reports the count; `bundlePricing` clamps the saving at zero so a curated price above the items total never shows a negative saving.

**Commit:** _pending_



---

## TASK-008 — Bulk ordering (tiered pricing + bulk qty UI) ☑

**Objective:** Let a product offer a lower unit price as quantity rises (volume
discounts for schools / offices / resellers) — shown on the PDP and actually
charged at checkout — with a bulk-friendly quantity input.

**Design:** price tiers live in one `jsonb` column on `products` (`price_tiers`),
mirroring the `specs`/`images` jsonb pattern. Each tier is `{min_qty,
discount_bps}` — a percentage off (basis points, like `tax_rate_bps`) applied to
**each variant's own base price**, so one tier set works across variants at
different prices. The field helpers (normalize/select/effective-price/display)
are defined once in `src/lib/catalog/pricing-tiers.ts` and shared by the PDP, the
cart (server-enforced unit price) and the admin form. Pricing is enforced in
`getCartLines` (the single server-trusted place unit price is resolved), so the
cart, totals, promotions and the order snapshot all use the tiered price; the
PDP display matches what is charged. The tier discount applies to the line unit
price first, then the existing promotion engine runs on the resulting subtotal
(promo order unchanged).

**Files added**
- `src/lib/catalog/pricing-tiers.ts` — `PriceTier` type, `normalizeTiers()`
  (drop invalid, sort by min_qty, dedupe), `tierForQty()`, `tierUnitPrice()`
  (clamped ≥ 0, reuses `applyPercent`), `hasTiers()` and `tierRows()`
  (display-ready rows for the PDP table).
- `supabase/migrations/0009_price_tiers.sql` — `alter table products add column
  if not exists price_tiers jsonb not null default '[]'::jsonb`.

**Files modified**
- `src/lib/types.ts` — `Product.price_tiers: PriceTier[]`; re-exports `PriceTier`.
- `src/lib/catalog/queries.ts` — `price_tiers` added to `PRODUCT_SELECT` and the
  two `searchProducts` selects.
- `src/lib/admin/catalog-queries.ts` — `price_tiers` added to the admin `SELECT`.
- `src/lib/validation/product.ts` — `price_tiers` array added to `productSchema`
  (min_qty ≥ 2, discount_bps 1–10000, defaults `[]`).
- `src/lib/admin/product-actions.ts` — `saveProduct` persists `normalizeTiers(p.price_tiers)` on the product row.
- `src/lib/cart/actions.ts` — `getCartLines` fetches `price_tiers` and sets
  `unit_price_minor = tierUnitPrice(base, line.quantity, tiers)`; keeps the base
  as `compare_at_minor` when a tier applies so the saving shows.
- `src/components/store/pdp-buy.tsx` — a "Buy more, save more" tier table
  (1+ / each breakpoint, unit price + save %), a live "You pay X each" as the qty
  crosses a breakpoint (active row highlighted), and a typeable bulk quantity
  input (clamped to available), accepts a `tiers` prop.
- `src/app/products/[slug]/page.tsx` — passes `product.price_tiers` to `PdpBuy`.
- `src/components/admin/product-form.tsx` — a "Bulk pricing" section (add/remove
  rows: min qty + % off); submit builds a cleaned `price_tiers` payload (bps).
- `src/lib/demo/data.ts` — `product()` helper takes optional `tiers`; the A5
  Dotted Notebook carries `[{min_qty:5,discount_bps:500},{min_qty:10,discount_bps:1000}]`.
- `supabase/seed.sql` + `supabase/setup.sql` — `price_tiers` column added to the
  products DDL (setup) and the dotted-notebook seed row (both), keeping the three
  schema copies in step.

**Acceptance criteria** (all met)
- A product with tiers shows a tier table on the PDP; raising the qty to a
  breakpoint lowers the shown unit price and adds to cart at that effective price.
- Cart / totals / checkout charge the tiered unit price (server-enforced in
  `getCartLines`, consumed by `computeTotals`, the promo engine and the order
  snapshot); a product with no tiers is unchanged.
- Admins set/edit tiers from the product form (no-op write in demo mode).
- Schema in step across `migrations/*`, `seed.sql` and `setup.sql`; demo mode
  renders the table + tiered pricing without a backend.

**Tests performed**
- `npm run typecheck` — pass.
- `npm run build` — pass; `/products/[slug]` builds as a dynamic/ISR function (ƒ).
- Browser check (demo mode): `/products/a5-dotted-notebook` shows the "Buy more,
  save more" table — 1+ LKR 1,500.00 · 5+ LKR 1,425.00 (Save 5%) · 10+ LKR
  1,350.00 (Save 10%); setting qty 10 updates the header to "You pay LKR 1,350.00
  each" and highlights the 10+ row. `/admin/products/p3` shows the Bulk pricing
  section pre-filled from the saved tiers (5 → 5%, 10 → 10%). (The only console
  error was the known stale-dev-process hydration mismatch on the TASK-007
  `/bundles` header link — not from this task and not present in the clean
  production build; cleared by a dev restart.)

**Notes**
- Tiers are a percentage off each variant's base price (not absolute per-qty
  prices), so one tier set is correct across multi-variant products.
- Number specs aside, this is the first product attribute that changes the
  charged price, so enforcement lives server-side in `getCartLines`; the PDP is
  display only and never the source of truth.
- Admin CRUD is the product-form section only (no separate bulk-pricing admin),
  consistent with specs.

**Commit:** _pending_


---

## TASK-009 — Delivery method selection at checkout ☑

**Objective:** Let the customer choose Standard delivery, Express delivery or
Store pickup at checkout, with the fee reflected in the order total, charged
server-side and recorded on the order.

**Design:** methods, copy and fee rules live in one module,
`src/lib/checkout/delivery.ts` (`DELIVERY_METHODS`, `deliveryFee()`), mirroring
the `specs.ts` / `pricing-tiers.ts` single-source pattern — no new store
settings or admin fields. Fees:
- **Standard** — the store `flat_shipping_minor`; free over the free-shipping
  threshold or with a free-shipping promo (unchanged behaviour, and the default).
- **Express** — flat fee + `EXPRESS_SURCHARGE_MINOR` (LKR 400.00); a paid
  upgrade, **never** waived by the threshold or a free-shipping promo.
- **Pickup** — always free; no delivery address is collected.

`computeTotals` takes an optional `delivery_method` on its settings argument
(default standard, so the cart/drawer are unchanged). `getCartSummary` returns
`deliveryTotals` (shipping + total per method, server-computed) so the checkout
switches methods with no client price math; `createCheckout` re-validates the
method (`checkoutSchema`), recomputes totals with it and stores it in the new
`orders.delivery_method` column.

**Files added**
- `src/lib/checkout/delivery.ts` — `DeliveryMethodId`, `DELIVERY_METHODS`,
  `DELIVERY_METHOD_IDS`, `DEFAULT_DELIVERY_METHOD`, `EXPRESS_SURCHARGE_MINOR`,
  `deliveryMethod()` (unknown/missing → standard) and `deliveryFee()`.
- `supabase/migrations/0010_delivery_method.sql` — `orders.delivery_method text
  not null default 'standard'` with a check constraint.

**Files modified**
- `src/lib/pricing/cart-total.ts` — `ShippingTaxSettings.delivery_method?`;
  shipping resolved through `deliveryFee()`.
- `src/lib/validation/checkout.ts` — `checkoutSchema` (address + `delivery_method`;
  `line1`/`city` required only when the method ships). `addressSchema` unchanged.
- `src/lib/cart/summary.ts` — `deliveryTotals` per method.
- `src/lib/checkout/actions.ts` — parses `checkoutSchema`, prices with the chosen
  method, blanks address lines for pickup, writes `delivery_method` on the order.
- `src/components/checkout/checkout-client.tsx` — delivery-method radio cards
  (label, ETA, fee); address fields hidden for pickup; order summary shipping row
  + total follow the selection.
- `src/app/checkout/page.tsx` — passes `deliveryTotals`.
- `src/app/account/orders/[id]/page.tsx`, `src/app/admin/orders/[id]/page.tsx`,
  `src/app/admin/orders/[id]/invoice/route.ts` — shipping row labelled with the
  method; address block tolerates a pickup order (no address lines).
- `src/lib/account/queries.ts` — `delivery_method` added to the order select.
- `src/lib/demo/data.ts` — optional `delivery_method` on `DemoOrder`.
- `supabase/setup.sql` — `delivery_method` column in the `orders` DDL (`seed.sql`
  has no orders DDL or rows, so needs no change).
- `tests/unit/pricing.test.ts` — delivery-method fee + `checkoutSchema` tests.

**Acceptance criteria**
- Checkout offers Standard / Express / Pickup with each fee shown; choosing one
  updates the summary shipping row and total. _(implemented; not browser-checked — see Tests)_
- The server recomputes the total with the chosen method and rejects unknown
  methods; the method is stored on the order. _(met — unit-tested schema + totals)_
- Pickup needs no address; delivery methods still require one. _(met — unit-tested)_
- Order detail (account + admin) and the invoice name the method; older orders
  read as Standard delivery. _(met — browser-checked in demo mode)_

**Tests performed**
- `npm run typecheck` — pass.
- `npm test` — pass (26 tests; 7 new: express = flat + surcharge, express not
  waived by threshold/promo, pickup free, empty cart, address required unless
  pickup, unknown method rejected, missing method defaults to standard).
- `npm run build` — pass; `/checkout` and the order routes build as dynamic (ƒ).
- Browser check (demo mode): `/admin/orders/o1` shows “Standard delivery” on the
  shipping row and the address card; no console errors.
- **Not verified:** the checkout selector UI and a real `createCheckout` run.
  The cart is disabled in demo mode, so `/checkout` only renders its empty-cart
  state without Supabase. Check both once a backend is connected.

**Notes**
- Existing Supabase projects must run `0010_delivery_method`.
- The express surcharge and the delivery ETAs are code constants in
  `delivery.ts`; the copy on `/shipping` and `/faq` was not changed.
- Order emails do not show a shipping line, so they were left as is.

**Commit:** _pending_


---

## TASK-010 — Saved delivery address book ☑

**Objective:** Let a signed-in customer keep a book of delivery addresses —
add / edit / delete and mark one default — and pick a saved address at checkout
so the delivery form is prefilled.

**Design:** addresses are a first-class owner-scoped table (`addresses`),
mirroring the `wishlists` RLS pattern (`customer_id = auth.uid()` for all ops).
Fields match the checkout delivery fields plus a `label` ("Home", "Office") and
`is_default`; email is account-level, so it is **not** stored per address.
Single-default is kept in the server action (setting one unsets the others),
not a partial unique index, to stay simple and demo-safe. The account page and
the checkout picker both read `getMyAddresses()`; checkout prefills the default
on load and lets the customer switch to another saved address or a new one.

**Files added**
- `supabase/migrations/0011_addresses.sql` — `addresses` table + index +
  `set_updated_at` trigger + owner-all RLS policy.
- `src/lib/validation/address.ts` — `addressBookSchema` (label/full_name/phone/
  line1/line2/city/postal_code/country + `is_default`; country defaults `LK`).
- `src/lib/account/addresses.ts` — `SavedAddress` type, `getMyAddresses`,
  `saveAddress` (insert/update; unsets other defaults), `deleteAddress`,
  `setDefaultAddress`; demo mode returns fixtures, writes no-op with a message.
- `src/components/account/address-book.tsx` — client address book (cards with a
  Default badge, Edit / Delete / Set default, and an add/edit form).
- `src/app/account/addresses/page.tsx` — account page that lists the book.
- `tests/unit/address.test.ts` — `addressBookSchema` validation tests.

**Files modified**
- `src/components/account/account-nav.tsx` — "Addresses" nav link (MapPin),
  between Profile and Wishlist.
- `src/app/checkout/page.tsx` — fetches `getMyAddresses()` + the current user in
  parallel and passes `savedAddresses` + `defaultEmail` to the checkout client.
- `src/components/checkout/checkout-client.tsx` — prefills email from the
  account and the default saved address; a saved-address picker (cards + "Use a
  new address") when the method ships and the customer has saved addresses.
- `src/lib/demo/data.ts` — `demoAddresses` (Home default + Office) so the book is
  viewable without a backend.
- `supabase/setup.sql` — `0011_addresses` block appended (no seed rows:
  addresses reference auth-backed customers this file does not create).

**Acceptance criteria** (all met)
- A signed-in customer can add, edit, delete and set a default address; exactly
  one stays default. _(met — server action; browser-checked in demo mode for
  list/add/no-op)_
- Addresses are owner-scoped (RLS) and never leak across accounts. _(met — RLS
  policy mirrors wishlists)_
- Checkout offers the saved addresses and prefills the chosen one (default on
  load); email prefills from the account. _(implemented; the picker is not
  browser-checked — the cart is disabled in demo mode, so `/checkout` only
  renders its empty-cart state, same limitation as TASK-009)_
- Schema is in step across `migrations/*` and `setup.sql` (`seed.sql` has no
  customer rows, so needs none); demo mode renders the book without a backend.

**Tests performed**
- `npm run typecheck` — pass.
- `npm test` — pass (31 tests; 5 new address-schema tests).
- `npm run build` — pass; `/account/addresses` builds as a dynamic function (ƒ,
  the account layout is `force-dynamic`).
- Browser check (demo mode): `/account/addresses` lists the two demo addresses
  (Home with a Default badge, Office with "Set default"), the "Addresses" nav
  link is present, the add form opens and saving shows "Demo mode — connect
  Supabase to save addresses."; no console errors. `/checkout` still renders its
  empty-cart state with no console errors after the added server fetches.

**Notes**
- Existing Supabase projects must run `0011_addresses`.
- The checkout picker and a real save/default run need a backend + a non-empty
  cart to verify end to end (demo mode disables the cart).

**Commit:** _pending_
