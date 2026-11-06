# WriteSpace.lk — Architecture

Online stationery store (kids + adults). Premium motion storefront + full admin dashboard.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) | Server Actions + Route Handlers |
| UI | Tailwind CSS + shadcn/ui | |
| Motion | Framer Motion (`motion/react`); GSAP ScrollTrigger only for scroll sections | Lazy-loaded |
| Backend | Supabase: Postgres, Auth, Storage, RLS | Single source of truth |
| Payments | Stripe behind `PaymentProvider` interface | PayHere added later, no refactor |
| Email | Resend | Order + refund emails |
| Search | Postgres `tsvector` + GIN | No paid search |
| Deploy | Cloudflare Pages or Netlify | Commercial-use OK (not Vercel Hobby) |
| Validation | Zod | All inputs |
| Tests | Vitest (unit) + Playwright (E2E) | |

> **Deploy note:** Next.js on Cloudflare Pages needs `@cloudflare/next-on-pages` + edge-compatible code, or `@opennextjs/cloudflare`. Netlify runs the Next adapter more directly. **Open decision #1** below.

## 2. Folder structure

```
src/
  app/
    (store)/
      page.tsx                      # home: hero, deals, collections
      products/page.tsx             # catalog + filters (URL state)
      products/[slug]/page.tsx      # PDP (ISR)
      c/[category]/page.tsx         # category listing
      promotions/page.tsx
      search/page.tsx
      cart/                         # drawer is global; page is fallback
      checkout/page.tsx
      checkout/confirmation/[orderId]/page.tsx
      account/orders/page.tsx
      account/orders/[id]/page.tsx  # tracking timeline
    (auth)/
      login/ register/ forgot-password/
    (admin)/
      admin/page.tsx                # dashboard
      admin/products/ ...           # CRUD, variants, CSV
      admin/categories/
      admin/inventory/
      admin/orders/ orders/[id]/
      admin/refunds/
      admin/promotions/ banners/
      admin/customers/
      admin/staff/
      admin/audit-log/
      admin/settings/
    api/
      webhooks/stripe/route.ts      # signature-verified, idempotent
  components/  (ui/, store/, admin/, motion/)
  lib/
    supabase/   (server.ts, client.ts, admin.ts [service-role, server-only])
    pricing/    (cart-total.ts, promotions-engine.ts, money.ts)
    payments/   (provider.ts [interface], stripe.ts)
    orders/     (state-machine.ts, inventory.ts)
    auth/       (roles.ts, guards.ts)
    validation/ (zod schemas)
  middleware.ts                     # admin route gate + session refresh
supabase/
  migrations/  seed.sql
tests/  (unit/, e2e/)
```

## 3. Data model (ERD summary)

```
categories (self-ref parent_id) --< products >-- collections (via product_collections)
products --< product_variants --< inventory (1:1 per variant)
customers (-> auth.users) --< carts --< cart_items (-> variant)
customers --< orders --< order_items (price snapshot)
orders --1-- payments --< refunds
promotions --< promotion_redemptions (-> order, customer)
banners (standalone, scheduled)
admin_users (-> auth.users, role + permissions jsonb)
audit_logs (actor, action, entity, before/after jsonb)
reviews (-> product, customer)  [optional, phase 7+]
```

Key columns:
- **Money:** every amount is `integer` **minor units** (cents) + `currency char(3)`. Never float. Helpers in `lib/pricing/money.ts`.
- **products:** slug (unique), status `draft|published`, age_group `kids|adults|all`, brand, SEO fields, `search_vector tsvector` (GIN index, trigger-maintained).
- **product_variants:** sku, option values (jsonb), price_minor, compare_at_minor (strike-through).
- **inventory:** on_hand, reserved, `available = on_hand - reserved`, low_stock_threshold.
- **orders:** status (state machine), subtotal/discount/shipping/tax/total minor, shipping_address jsonb, tracking_number, idempotency_key.
- **order_items:** snapshot of name/sku/unit_price at purchase time (immutable).
- **promotions:** type, value, code (nullable), starts/ends_at, usage_limit, per_customer_limit, min_subtotal, stackable bool, priority.

## 4. Money handling
Integer minor units everywhere; format only at display. Server computes every total. Client prices are display hints, re-validated server-side at checkout.

## 5. Order state machine

```
pending_payment --paid--> paid --fulfill--> fulfilled --ship--> shipped --deliver--> delivered
     |                      |
     +--expire/cancel--> cancelled      any paid+ --refund--> refunded | partially_refunded
```
Transitions are the only way to change `status`; each logs an audit entry. Invalid transitions throw.

## 6. Inventory strategy
1. **Checkout start:** reserve stock (`reserved += qty`) with a `reserved_until` expiry (~15 min).
2. **Payment success (webhook):** `on_hand -= qty`, release reservation.
3. **Expiry / cancel / payment fail:** release reservation (`reserved -= qty`).
4. **Refund with restock:** `on_hand += qty`.
A cron/edge function sweeps expired reservations. Decrements run in a DB transaction / RPC to avoid overselling.

## 7. Auth & roles
- Roles: `customer`, `staff`, `admin`. Staff gets a granular `permissions` jsonb (e.g. `orders:write`, `refunds:create`, `promotions:write`).
- **Defense in depth:** `middleware.ts` gates `/admin/*`; every admin Server Action re-checks role+permission; RLS enforces at the DB. No single point of trust.
- RLS: customers read only their own cart/orders; catalog is public-read (published only); all writes to financial tables via service-role server code or admin policies.

## 8. Payment flow
1. Client hits checkout Server Action -> server recomputes cart from DB (prices, promos, shipping, tax).
2. Create order `pending_payment` + reserve stock + generate idempotency key.
3. Create Stripe Payment Intent / Checkout Session (amount from server total).
4. `api/webhooks/stripe`: verify signature, dedupe by event id (store processed ids), on `payment_intent.succeeded` -> mark paid, decrement stock, send email. Idempotent.
5. Refunds: admin action -> Stripe refund API (idempotency key) -> update order + refunds table -> optional restock -> email customer -> audit log.

## 9. Promotion engine
Pure, unit-tested function: `apply(cart, promotions, customer) -> { lineAdjustments, discountTotal, freeShipping }`.
- Types: percentage, fixed amount, buy-X-get-Y, free shipping, coupon code.
- Guards: date range, usage_limit, per_customer_limit (via redemptions), min_subtotal.
- Stacking: `stackable` flag + `priority` order; non-stackable applies best single. Deterministic, server-only.

## 10. Caching / ISR
- Home, catalog, PDP, category, promotions: **ISR** (revalidate ~60s) + on-demand revalidate tag when admin publishes/edits.
- Cart, checkout, account, all `/admin`: **dynamic**, no cache, user-scoped.
- Images via `next/image` with responsive sizes; Supabase Storage as origin.

## 11. API / Server Action surface (high level)
- Store: `addToCart`, `updateCartItem`, `applyPromo`, `startCheckout`, `getOrder`.
- Webhook: `POST /api/webhooks/stripe`.
- Admin actions (role-gated + logged): product/category/inventory/promotion/banner CRUD, `transitionOrder`, `createRefund`, `inviteStaff`, `setPermissions`, settings.

## 12. Open decisions (need your call)
1. **Cloudflare Pages vs Netlify** - Netlify = smoother Next.js adapter, simplest path. Cloudflare = cheapest at scale but needs edge-compatible code. *Recommend Netlify to start.*
2. **Currency** - LKR primary? Stripe may need a workaround for LKR (not all methods support it). Confirm currency + whether PayHere is the real day-1 gateway for Sri Lanka (Stripe may be test-only here).
3. **Tax/shipping** - flat shipping + simple tax rule to start, or zones/weight-based?
4. **Guest checkout** - allow, or require account?
5. **Reviews** - in MVP or deferred to a later phase?

---
Phases 2-9 proceed only after you approve this. Each phase ends with: files changed, manual-verify steps, open questions. No paid service added without asking.
