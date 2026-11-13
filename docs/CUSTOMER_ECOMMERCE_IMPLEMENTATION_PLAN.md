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
| TASK-008 | Bulk ordering (tiered pricing + bulk qty UI) | 005 | ☐ |
| TASK-009 | Delivery method selection at checkout (standard / express / pickup) | — | ☐ |
| TASK-010 | Saved delivery address book in account | 009 | ☐ |

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
