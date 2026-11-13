# WriteSpace.lk — Progress

> Rolling status log. Update after each development session.
> **Last updated:** 2026-11-13 · **Branch:** `main` · **Last commit:** `2d8518d` (feat(customer): add About page + footer link — TASK-002)
> "Verified" = built + browser-checked this session. "Committed" = in Git history but not re-verified here.
> See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) (structure) and [ARCHITECTURE.md](ARCHITECTURE.md) (design).

## Current status

Feature-complete storefront + admin dashboard running in **demo mode** (in-repo
fixtures via `hasSupabase()`), so everything renders without a backend. Supabase
is **not yet connected**; Stripe/Resend keys are **not set**. No production deploy
yet — a temporary Cloudflare quick-tunnel link has been used for client previews
(ephemeral; dies when the dev server/session stops).

## Recently completed

Verified this session (built, typecheck + `next build` pass, browser-checked):
- Admin **categories & collections** manager (`32def20`)
- Admin **banners & content** manager (`02dff3e`)
- Admin **reviews moderation** (`0c5a7b2`)
- **SEO**: sitemap.xml, robots.txt, metadata/OpenGraph, product + Organization/WebSite JSON-LD; **refunds ledger** (`d76a1aa`)
- **Store contact & social** settings wired to the footer (`2031d41`)
- Admin **customers** pages made demo-viewable (`d95a87d`)
- Transactional **order emails** (confirmation/shipped/refunded) + `/api/email-preview` (`c232d97`)
- Server-backed **wishlist** with cross-device sync (`d94060d`)
- `docs/PROJECT_MAP.md` (`9634277`)
- **Customer content pages**: Shipping, Returns & Refunds, Privacy, Terms + shared `ContentPage` shell + footer legal links (TASK-001, `2c31aba`)
- **About page** (`/about`) using the content shell + footer About link (TASK-002, `2d8518d`)
- **Contact page** (`/contact`) — content-shell page with store contact cards + enquiry form posting to `/api/contact`, emailed to the store inbox via Resend (`lib/email/enquiry.ts`), no-op in demo mode; footer Contact link (TASK-003, _commit pending_)
- **FAQ page** (`/faq`) — stationery-focused Q/A (orders & payment, GSM/paper sizes/ruling/refills, delivery, returns) on the content shell + footer FAQ link (TASK-004, _commit pending_)
- **Stationery product specs** (GSM, paper size, ruling, sheet count, colour) — product-level `specs` jsonb + shared `lib/catalog/specs.ts`, admin form inputs, and a PDP spec table; schema in step across migrations/seed/setup (TASK-005, _commit pending_)
- **Spec-based catalog filters** (GSM, paper size, ruling, sheet count, colour) — multi-select facets on `/products` + `/c/[category]`, one URL param per spec key, counts from `computeFacets`, reusing `SPEC_FIELDS` (TASK-006, _commit pending_)
- **Bundles & school packs** (`/bundles` + `/bundles/[slug]`) — curated/grade packs of existing products with an optional bundle price + “Add all to cart” (`addManyToCart`); `bundles`/`bundle_items` schema in step across migrations/seed/setup, header + footer “School packs” links, sitemap entries (TASK-007, _commit pending_)
- **Bulk ordering** (tiered pricing + bulk qty UI) — per-product `price_tiers` jsonb (`{min_qty, discount_bps}`, % off each unit) via shared `lib/catalog/pricing-tiers.ts`; **enforced server-side in `getCartLines`** so cart/totals/checkout charge the tiered price; PDP “Buy more, save more” table + live per-unit price + typeable qty; admin “Bulk pricing” form section; schema in step across migrations/seed/setup (TASK-008, _commit pending_)
- **Delivery method at checkout** (Standard / Express / Store pickup) — methods + fee rules in shared `lib/checkout/delivery.ts` (express = flat + LKR 400, never waived; pickup free, no address); `computeTotals` prices the chosen method, `createCheckout` re-validates it and stores `orders.delivery_method` (migration `0010` + `setup.sql`); order detail/invoice name the method. Typecheck, unit tests and build pass; **checkout selector UI not browser-checked** (cart is disabled in demo mode) (TASK-009, _commit pending_)
- **Saved delivery address book** (`/account/addresses`) — owner-scoped `addresses` table (RLS like wishlists) with a book of add/edit/delete + default addresses (`lib/account/addresses.ts`, `addressBookSchema`); account page + nav link; checkout prefills email + the default saved address and offers a saved-address picker ("Use a new address"); `demoAddresses` fixtures; schema in `migrations/0011` + `setup.sql` (`seed.sql` needs none — no customer rows). Typecheck, 31 unit tests and build pass; address book browser-checked in demo mode (list/add/no-op); **checkout picker not browser-checked** (cart disabled in demo mode) (TASK-010, _commit pending_)

Committed earlier (not re-verified this session): checkout/payments, accounts,
admin dashboard, demo mode, PDP/reviews/quick-view/search, faceted filters,
admin design system, dashboard 2.0 + order ops, inventory, storefront motion,
engagement, `supabase/setup.sql`, account dashboard/profile/forgot-password.

## Current work

- TASK-010 (saved delivery address book) — **done this session; commit pending.** The checkout saved-address picker + a real save/default run still need a browser check once Supabase is connected (cart disabled in demo mode). TASK-003 to TASK-010 are all still uncommitted in the working tree. TASK-010 was the last item on the customer-facing roadmap — all ten tasks are now ☑ in the plan.
  See [docs/CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md](docs/CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md) for the full customer-facing roadmap.

## Pending tasks

- Connect Supabase (run migrations `0001`–`0006` or paste `supabase/setup.sql`),
  set `.env`, register an account, promote it to admin.
- Set `RESEND_API_KEY` + `ORDER_EMAIL_FROM` to enable real emails; `STRIPE_*` keys + webhook for payments.
- Set `NEXT_PUBLIC_SITE_URL` to the real domain (used by sitemap/metadata/emails).
- Decide on a persistent deploy (Netlify recommended in ARCHITECTURE.md) for a stable link.

## Known issues / limitations

- In demo mode, admin **writes** no-op or show an error toast by design (no backend) — not a bug.
- Existing Supabase projects need migrations `0005_store_contact`, `0006_wishlist`, `0007_product_specs`, `0008_bundles`, `0009_price_tiers`, `0010_delivery_method` and `0011_addresses` run (new columns/tables).
- The shared preview link is a quick tunnel: ephemeral and its URL rotates on restart.
- (Unknown) Stripe LKR support and whether PayHere is the day-1 gateway — open decision in ARCHITECTURE.md §12.

## Important implementation decisions

- Money is always **integer minor units** (LKR cents); formatting only at display (`lib/pricing/money.ts`).
- **Demo mode**: `hasSupabase()` returns in-repo fixtures (`lib/demo/data.ts`) when env is absent.
- Payments behind a **`PaymentProvider` interface** (Stripe active, PayHere stub).
- **Defense in depth** for admin: middleware gate + `requirePerm` in server actions + Postgres RLS.
- 3 copies of DB schema kept in step: `supabase/migrations/*`, `seed.sql`, and the one-shot `setup.sql`.

## How to update this file

After a session: bump **Last updated** + **Last commit**, move finished items into
**Recently completed** (mark Verified vs Committed), and refresh **Current work** /
**Pending** / **Known issues**.
