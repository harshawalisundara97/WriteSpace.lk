# WriteSpace.lk — Progress

> Rolling status log. Update after each development session.
> **Last updated:** 2026-11-17 · **Branch:** `main` · **Last commit:** `842d5f0` (feat: implement saved delivery address book for customers — TASK-010)
> "Verified" = built + browser-checked this session. "Committed" = in Git history but not re-verified here.
> See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) (structure) and [ARCHITECTURE.md](ARCHITECTURE.md) (design).

## Current status

Feature-complete storefront + admin dashboard running in **demo mode** (in-repo
fixtures via `hasSupabase()`), so everything renders without a backend. Supabase
is **not yet connected**; Stripe/Resend keys are **not set**. No production deploy
yet — a temporary Cloudflare quick-tunnel link has been used for client previews
(ephemeral; dies when the dev server/session stops).

## Recently completed

- **Cash on Delivery** (TASK-NEXT-002, _commit pending_): admin toggle, COD fee (default LKR 150), max order value (default LKR 25,000, checked before the fee) and allowed districts (all 25 by default) in Settings; checkout "Pay online / Cash on delivery" choice with a district picker and fee line, re-checked server-side (`lib/checkout/cod.ts`). COD orders commit stock at checkout, have no hold expiry, stay `pending_payment` (awaiting payment) through fulfilled → shipped, and the payment is marked succeeded on **delivered** (`order.cod_collected` audit). A refused or cancelled COD order is restocked. Migration `0014_cash_on_delivery.sql` (mirrored in `setup.sql`). Verified on local Supabase: placed, fulfilled, shipped and delivered.
- **Guest order tracking** (TASK-NEXT-003, _commit pending_): public `/track` page (`?order=` prefill; footer "Track order" now points here). Guest enters order number + checkout email **or** delivery phone (SL formats normalised); server action `lib/orders/track-actions.ts` returns a minimal view (status, item count, timeline, courier) and the same generic error for unknown order / wrong contact. Timeline (`lib/orders/tracking.ts`) is built from `audit_logs` status events with the current status as fallback; COD orders skip the payment step; cancelled/refunded shown as a note. Admin order page: courier (Domex, Pronto, Koombiyo, Sri Lanka Post, Other) + tracking no. + optional http(s) link (`setTracking`, zod-validated, audited). Manual links only, no courier APIs (owner decision 2026-11-16). Migration `0015_order_tracking.sql` (mirrored in `setup.sql`). Tests: `tests/unit/tracking.test.ts`. Verified on local Supabase in the browser (phone lookup on a COD order, courier link). No rate limiting on `/track` yet.
- **School book-list matcher** (TASK-NEXT-004a, _commit pending_): `lib/booklist/match.ts` (pure) parses a pasted list into lines — strips bullets/numbering, reads quantities (`x3`, `4 nos`, `6 pcs`, `2 x …`, leading `5 Pencils` ≤20; capped 99), skips headings/blank lines, max 100 lines — and scores product matches (token + prefix + bigram similarity, plural-tolerant, joined-word check for "water colour"). `lib/booklist/actions.ts` `matchBookList` looks up candidates via catalog `searchProducts` (full phrase + up to 3 per-word searches), returns best match (≥0.5; "review" below 0.75), up to 5 alternatives, or "unmatched". Works in demo mode; no UI or schema yet (004b–d). Tests: `tests/unit/book-list.test.ts`. Paste-only (no OCR) per owner decision 2026-11-16.
- **Book-list review page** (TASK-NEXT-004b, _commit pending_): public `/book-list` (footer link + sitemap). Parent pastes a list → `matchBookList` (now also returns each product's active variants with price + available stock via new `getProductsByIds`) → review rows: include checkbox, product picker (best + alternatives, or skip), variant picker when >1, quantity, line price, "please check" / "not found" (with shop-search link) / out-of-stock / low-stock hints. Sticky summary shows selected count + list-price subtotal; "Add all to cart" uses existing `addManyToCart` (merges same variant, skips lines short of stock and reports them). Pure helpers `reviewToCartItems` / `reviewSubtotalMinor` unit-tested. Verified on local Supabase in the browser (match → add 4 lines to cart; mobile 375px no horizontal scroll). Cart add still needs Supabase (demo mode shows the existing "connect Supabase" message).
- **Back-in-stock alerts** (TASK-NEXT-005, _commit pending_): out-of-stock PDP variant shows "Email me when it's back" (`lib/stock-alerts/actions.ts` `requestStockAlert`, zod, one pending alert per email+variant, audited). Adding stock via admin inventory adjust or CSV import calls `notifyBackInStock` → one Resend email per waiting shopper, `notified_at` set, `stock_alert.notified` audit. Admin inventory page lists "Back-in-stock requests" (waiting count, available, since). Migration `0016_stock_alerts.sql`. Tests: `tests/unit/stock-alerts.test.ts`. Verified on local Supabase in the browser: request saved + audited, admin demand table, admin restock 0→119 marked the alert notified + `stock_alert.notified` audit (email logged, no Resend key locally). Restocks from cancelled/refunded orders don't notify yet.
- **Abandoned-cart email** (TASK-NEXT-006, _commit pending_): `GET /api/cron/abandoned-carts` (Bearer `CRON_SECRET`; 503 when unset) emails signed-in customers whose cart is idle 24h–7d, once per idle period (`carts.reminder_sent_at`; a `cart_items` trigger bumps `carts.updated_at` and re-arms it). Skips blocked / opted-out customers and inactive products; audited `cart.reminder_sent`. Unsubscribe: HMAC link (`UNSUBSCRIBE_SECRET`, falls back to `CRON_SECRET`) → `/unsubscribe` button sets `customers.cart_reminders_opt_out` (audited). `vercel.json` cron daily 04:30 UTC (Hobby plan limit). Migration `0017_abandoned_cart.sql`. Tests: `tests/unit/abandoned-cart.test.ts`. Verified on local Supabase: wrong/missing secret → 401/503; idle cart → 1 sent, rerun → 0; unsubscribe page sets opt-out (audited); a cart change re-arms but opted-out customer is skipped.
- **Gift wrap & message** (TASK-NEXT-007, _commit pending_): admin Settings toggle + flat fee (default LKR 250, off by default). Checkout checkbox + 200-char message; fee re-checked server-side (`lib/checkout/gift.ts`), snapshotted on `orders.gift_wrap_minor`, included in total and payment amount. Shown on confirmation, admin order page (gift card) and invoice; new **packing slip** (`/admin/orders/[id]/invoice?slip=1`, no prices, gift message box). Also fixed: online payment amount now uses the full order total. Migration `0018_gift_wrap.sql`. Tests: `tests/unit/gift.test.ts`. Verified in the browser on local Supabase: pickup + pay-at-store + gift wrap with message → total LKR 10,532 (incl. 150 COD + 250 wrap), stored on order and payment, shown on confirmation, admin order page and packing slip.

- **Loyalty points** (TASK-NEXT-008a–d, _commit pending_): 1 pt per LKR 100 of merchandise (after promo/points discounts) earned when an order is **delivered**; 1 pt = LKR 1 off at checkout, max 50% of items; points expire 12 months after earning (FIFO). All admin-editable in Settings (off by default). Append-only `loyalty_ledger` (earn/redeem/adjust/reverse), RLS self-read. Refunds claw back earned points pro rata; a DB trigger restores redeemed points once when an order is cancelled (any path). Account page shows balance + history; admin customer page shows ledger + audited manual adjust (can't overdraw). Migrations `0019_loyalty.sql`, `0021_loyalty_restore.sql`. Tests: `loyalty*.test.ts`. Verified on local Supabase in the browser (COD order redeemed 300 pts → cancel restored them; settings save; adjust +150 / −500 refused). Known gap: two simultaneous checkouts could double-spend points.
- **B2B / office quotes** (TASK-NEXT-009a–d, _commit pending_): `/quote` from the cart (quantities may exceed stock; honeypot; cart untouched) → `requested`. Admin **Quotes** (orders:write): per-line pricing, "list −X%" fill, stock shortfall flag, delivery, validity (default 14 days), draft/send/decline, all audited. Buyer gets an email with a secret link `/quote/view/<token>` (no login) + printable quotation (`/pdf`, browser Save as PDF); accepts online with delivery address + optional PO. Staff convert an accepted quote → order with new **`invoice`** payment method (stock committed at conversion; fulfil/ship before payment; "Mark invoice paid"; cancel restocks). Migrations `0020_quotes.sql`, `0022_quote_access.sql`, `0023_quote_orders.sql`. Tests: `quote*.test.ts`. Verified end to end on local Supabase. Invoice orders can't be refunded via the gateway (manual bank refund).
- **Sinhala & Tamil UI** (TASK-NEXT-010a–c, _commit pending_): locale from `?lang=` / `ws_locale` cookie / Accept-Language; `<html lang>` = en-LK/si-LK/ta-LK; header, footer and cart drawer translated with a language switcher. si/ta strings are **machine-drafted — native review pending (010d)**. Per-page self-canonical + hreflang (`localeAlternates`) and sitemap alternates. Also fixed: the root layout's `canonical: "/"` was inherited by every page without its own (e.g. /products, product pages). Product/page content is still English; Sinhala/Tamil fall back to system fonts.
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
- **Saved delivery address book** (`/account/addresses`) — owner-scoped `addresses` table (RLS like wishlists) with a book of add/edit/delete + default addresses (`lib/account/addresses.ts`, `addressBookSchema`); account page + nav link; checkout prefills email + the default saved address and offers a saved-address picker ("Use a new address"); `demoAddresses` fixtures; schema in `migrations/0011` + `setup.sql` (`seed.sql` needs none — no customer rows). Typecheck, 31 unit tests and build pass; address book browser-checked in demo mode (list/add/no-op); **checkout picker not browser-checked** (cart disabled in demo mode) (TASK-010, `842d5f0`)
- **Admin bundles / school packs CRUD** (`/admin/bundles`) — list, create/edit, delete, publish ⇄ draft, item builder (product + variant + qty with live totals), optional curated price; `products:write`-gated actions + nav, every write audited, storefront `/bundles` revalidated; `bundleSchema` + item normalization with 9 unit tests. Typecheck, 40 tests and build pass; browser-checked in demo mode (list, form, item builder, demo-mode toast) (TASK-ADMIN-001, _commit pending_)
- **Admin permission registry + staff guards** — central `lib/auth/permissions.ts` (typed `Permission`, labels, zod staff schemas, `checkStaffChange`); `requirePerm`/nav typed to the registry; staff actions validated and guarded against self-demotion/removal, last-admin loss, non-admins managing admins, and permission escalation; `inviteStaff` no longer upserts over existing access; staff UI surfaces errors. Typecheck, 51 tests and build pass; not run against live Supabase (TASK-ADMIN-002, _commit pending_)
- **Admin validation + uniform errors** — shared `lib/validation/admin.ts` (category/collection/promotion/banner/settings schemas, `parseInput`, `zodErrorMessage` with field labels, `dbErrorMessage` for unique/FK violations, shared `DEMO_MESSAGE`); tightened rules (percentage 1–100, positive fixed discount, code charset, end after start, safe banner links, https social URLs, uppercase currency, no self-parent); deletes validate ids, check DB errors and surface failures in the UI; demo-mode guard on all these writes. Typecheck, 59 tests and build pass; not run against live Supabase (TASK-ADMIN-003, _commit pending_)
- **Admin reports & analytics** (`/admin/reports`) — date-ranged (from/to, UTC, default 30d, max 366d) paid-order sales-by-day, tax summary and product sales; CSV export per report via `/api/admin/reports/export` (formula-injection-safe cells, major units); pure builder `lib/admin/reports.ts` + `report-queries.ts` (demo fallback); page, route and nav gated on `orders:write`. Typecheck and 104 tests pass (14 new); not browser-checked or run against live Supabase (TASK-ADMIN-006, _commit pending_)

Committed earlier (not re-verified this session): checkout/payments, accounts,
admin dashboard, demo mode, PDP/reviews/quick-view/search, faceted filters,
admin design system, dashboard 2.0 + order ops, inventory, storefront motion,
engagement, `supabase/setup.sql`, account dashboard/profile/forgot-password.

## Current work

- **TASK-NEXT-001 PayHere** split into 001a checkout redirect · 001b notify webhook · 001c admin refunds · 001d sandbox E2E. **001a done (uncommitted):** `payhere-checkout.ts` (MD5 hash, LKR amount, form fields), `payhere.ts` `createIntent`, checkout auto-POSTs to PayHere when `PAYMENT_PROVIDER=payhere`; `tests/unit/payhere.test.ts`. Not yet sandbox-tested (needs merchant creds); `notify_url` route lands in 001b.
- **Admin Dashboard phase** started. TASK-ADMIN-001 (bundles CRUD) and TASK-ADMIN-002 (permission registry + staff guards) and TASK-ADMIN-003 (admin validation + uniform errors) and TASK-ADMIN-004 (admin action + guard + CSV-import unit tests) — **done; commits pending.**
  See [docs/ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md](docs/ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md) for the admin roadmap and per-task records.
- Customer-facing roadmap (TASK-001–010) is complete and committed (`842d5f0`); the checkout saved-address picker still needs a browser check once Supabase is connected.
  See [docs/CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md](docs/CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md).

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
- Payments behind a **`PaymentProvider` interface** (Stripe default; PayHere checkout redirect via `PAYMENT_PROVIDER=payhere`, webhook/refunds pending).
- **Defense in depth** for admin: middleware gate + `requirePerm` in server actions + Postgres RLS.
- 3 copies of DB schema kept in step: `supabase/migrations/*`, `seed.sql`, and the one-shot `setup.sql`.

## How to update this file

After a session: bump **Last updated** + **Last commit**, move finished items into
**Recently completed** (mark Verified vs Committed), and refresh **Current work** /
**Pending** / **Known issues**.
