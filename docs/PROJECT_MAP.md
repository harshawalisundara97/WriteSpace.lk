# WriteSpace.lk — Project Map

A factual map of the repository as it exists. For the system design, data model,
and rationale see [../ARCHITECTURE.md](../ARCHITECTURE.md); for local setup and
env vars see [../README.md](../README.md). This file avoids repeating those.

Stack: Next.js 16 (App Router, TypeScript strict) · Supabase (Postgres/Auth/Storage/RLS)
· Stripe behind a provider interface (PayHere stub) · Resend · Tailwind v4 · Zod.

> **Demo mode:** when Supabase env vars are absent, `src/lib/env.ts` (`hasSupabase()`)
> makes queries return in-repo fixtures from `src/lib/demo/data.ts`, so the whole
> app renders without a backend. Writes degrade to no-ops/toasts.

## Directory overview

| Path | Responsibility |
|---|---|
| `src/app/` | Routes (App Router): storefront, auth, `/admin`, `/account`, API handlers |
| `src/components/` | UI by area: `store/`, `admin/`, `account/`, `cart/`, `checkout/`, `auth/`, `ui/` |
| `src/lib/` | Server/business logic (see below) |
| `src/middleware.ts` | Gates `/admin/*` + refreshes the Supabase session |
| `supabase/` | `migrations/` (0001–0006), `seed.sql`, and `setup.sql` (one-shot paste) |
| `tests/` | `unit/` (Vitest), `e2e/` (Playwright) |
| `public/` | Static SVGs |

## Main entry points

- `src/app/layout.tsx` — root layout; site metadata, fetches categories/cart/wishlist/settings, wraps storefront in `components/store/chrome.tsx`.
- `src/app/page.tsx` — storefront home.
- `src/app/admin/layout.tsx` + `src/app/admin/page.tsx` — admin shell + dashboard (own chrome; storefront chrome is hidden under `/admin`).
- `src/app/account/layout.tsx` — signed-in account area.
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook (signature-verified, idempotent, marks paid/failed).
- `src/app/sitemap.ts`, `src/app/robots.ts` — SEO routes.

## Important modules (`src/lib/`)

| Module | Responsibility |
|---|---|
| `supabase/` | `server.ts` (SSR client), `client.ts` (browser), `admin.ts` (service-role, server-only) |
| `pricing/` | `money.ts` (integer minor units), `cart-total.ts`, `promotions-engine.ts` (pure, unit-tested) |
| `payments/` | `provider.ts` (interface), `stripe.ts`, `payhere.ts` (stub), `index.ts` (selector) |
| `orders/` | `state-machine.ts` (allowed status transitions) |
| `auth/` | `guards.ts` (`requirePerm`), `user.ts` (`getCurrentUser`), `actions.ts` (sign in/up/out, reset) |
| `catalog/` | `queries.ts` (public catalog reads), `search-action.ts`, `variant-color.ts` |
| `cart/` | `actions.ts`, `summary.ts` |
| `checkout/` | `actions.ts` (server-recomputed totals, order creation) |
| `reviews/` | `queries.ts`, `actions.ts`, `types.ts` |
| `email/` | `order.ts` (Resend; confirmation/shipped/refunded templates + `renderOrderEmail`) |
| `admin/` | server actions + admin queries: `catalog-queries`, `queries` (orders/dashboard/customers/refunds), `order-actions`, `product-actions`, `inventory-actions`/`inventory`, `promo-actions`, `category-actions`, `review-actions`, `customer-actions`/`customer-queries`, `settings-actions`, `staff-actions`, `csv-actions` |
| `account/` | `queries.ts`, `actions.ts`, `wishlist.ts` (server-backed wishlist) |
| `validation/` | Zod schemas: `checkout.ts`, `product.ts` |
| `demo/data.ts` | In-repo fixtures used when Supabase is not configured |
| `env.ts`, `types.ts`, `utils.ts`, `newsletter.ts` | Env guard, shared types, helpers |

## Where to find implementations

- **Storefront pages:** `src/app/page.tsx`, `products/`, `products/[slug]/`, `c/[category]/`, `promotions/`, `wishlist/`, `checkout/`.
- **Admin sections:** `src/app/admin/<section>/` with matching UI in `src/components/admin/` and logic in `src/lib/admin/`. Nav + permissions: `src/components/admin/admin-nav.tsx`.
- **Pricing/promotions:** `src/lib/pricing/` (tested by `tests/unit/pricing.test.ts`).
- **Order lifecycle:** `src/lib/orders/state-machine.ts` + `src/lib/admin/order-actions.ts` (transitions, refunds, emails).
- **Email templates / preview:** `src/lib/email/order.ts`; preview at `GET /api/email-preview?type=confirmation|shipped|refunded`.
- **Auth/RLS boundary:** `src/middleware.ts`, `src/lib/auth/guards.ts`, SQL policies in `supabase/migrations/0002_rls.sql` (and `setup.sql`).

## Important configuration files

| File | Purpose |
|---|---|
| `next.config.ts` | Next.js config |
| `tsconfig.json` | TypeScript (strict), `@/*` path alias → `src/*` |
| `eslint.config.mjs` | ESLint (eslint-config-next) |
| `vitest.config.ts` | Unit test config |
| `playwright.config.ts` | E2E config |
| `.env` / `.env.example` | Supabase/Stripe/Resend keys, `NEXT_PUBLIC_SITE_URL` (gitignored) |
| `supabase/setup.sql` | One-shot schema + RLS + functions + seed for the Supabase SQL editor |

## Build and test commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest unit tests |
| `npm run e2e` | Playwright E2E (`tests/e2e/storefront.spec.ts`) |
| `npm run db:push` | Apply Supabase migrations |
| `npm run db:seed` | Load `supabase/seed.sql` |

## Module dependencies (high level)

- UI/pages → `lib/*` queries & server actions → `lib/supabase/*` (or `lib/demo/data.ts` in demo mode).
- Admin write actions → `lib/auth/guards.requirePerm` → `lib/supabase/admin` (service role) → `audit_logs`.
- Checkout/orders → `lib/pricing/*` + `lib/orders/state-machine` + `lib/payments/*`; Stripe webhook → order/payment updates + `lib/email/order`.
- Root layout → `components/store/chrome` → cart/wishlist/quick-view providers (client), wired with server-fetched data.
