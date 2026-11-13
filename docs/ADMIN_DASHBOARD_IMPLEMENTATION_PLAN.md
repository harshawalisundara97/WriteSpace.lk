# Admin Dashboard — Implementation Plan

Task-by-task roadmap for the **Admin Dashboard** phase. One task per Claude
conversation. This is a **separate phase** from the customer-facing work
(TASK-001–TASK-010, all ☑ — see
[CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md](CUSTOMER_ECOMMERCE_IMPLEMENTATION_PLAN.md)).
Admin task IDs are prefixed `TASK-ADMIN-###` and do **not** conflict with the
customer-facing IDs.

Status legend: ☐ pending · ◐ in progress · ☑ completed.

> Verified against the actual codebase on 2026-11-13 (routes, components,
> server actions, validation, schema, nav). "Verified" below = read in source.
> "Assumption" = inferred, flagged explicitly.

---

## Phase 1 — Audit of the existing Admin Dashboard

The admin surface is **substantial and mostly working** (demo-mode + Supabase
paths). Architecture = Next.js server components + `"use server"` actions, with
**defense in depth**: middleware gate → `requireAdmin`/`requirePerm` →
Postgres RLS. All writes record an `audit_logs` row.

Routes (`src/app/admin/`): `page` (dashboard), `orders`, `orders/[id]`,
`refunds`, `products`, `products/new`, `products/[id]`, `reviews`, `inventory`,
`categories`, `promotions`, `banners`, `customers`, `customers/[id]`, `audit`,
`staff`, `settings`. Server actions in `src/lib/admin/*`; guards in
`src/lib/auth/guards.ts`; nav in `src/components/admin/admin-nav.tsx`.

| Feature | Status | Evidence / notes |
|---|---|---|
| Admin home / overview (KPIs, revenue series, category breakdown, recent orders, low stock, top products, range toggle) | **Complete** | `admin/page.tsx`, `lib/admin/queries.ts::getDashboardMetrics`, `revenue-chart`, `category-breakdown` |
| Admin nav / sidebar (perm-filtered, mobile nav) | **Complete** | `admin-nav.tsx` (`visibleNav`), `admin-mobile-nav.tsx` |
| Product mgmt — create/edit/delete, variants, images upload, specs, bulk pricing tiers, bulk publish/draft/delete | **Complete** | `product-actions.ts` (`saveProduct`, `setProductStatus`, `deleteProduct`, `uploadProductImage`, `bulkProductAction`), `product-form.tsx`, `products-table.tsx` |
| Product CSV import / export | **Complete** | `csv-actions.ts::importProductsCsv`, `api/admin/products/export/route.ts`, `csv-tools.tsx` |
| Category management (CRUD) | **Complete** | `category-actions.ts` (`saveCategory`/`deleteCategory`), `categories-manager.tsx` |
| Collection management (CRUD) | **Complete** | `category-actions.ts` (`saveCollection`/`deleteCollection`) — admin CRUD exists; storefront consumption limited |
| **Bundle / School Pack management (admin CRUD)** | **Missing** | Schema exists (`bundles`, `bundle_items`, RLS `products:write`) and storefront pages exist (TASK-007), but **no `admin/bundles` route, no `bundle-actions.ts`, no nav item**. SQL-managed only — explicitly deferred in TASK-007. |
| Inventory / stock mgmt (list, low-stock, manual adjust) | **Complete** | `inventory-actions.ts::adjustInventory`, `inventory-table.tsx`, `lib/admin/inventory.ts` |
| Order mgmt — list, filter, detail, status transitions (state machine), tracking, notes, timeline | **Complete** | `order-actions.ts` (`transitionOrder`, `setTracking`, `updateOrderNotes`), `orders/state-machine.ts`, `order-controls`, `order-timeline`, `order-notes` |
| Refunds (ledger + create, restock flag) | **Complete** | `order-actions.ts::createRefund`, `getAdminRefunds`, `refunds/page.tsx` |
| Customer mgmt (list, detail, block/unblock) | **Complete** | `customer-actions.ts::setCustomerBlocked`, `customer-queries.ts`, `customers-table`, `block-button` |
| Promotions / coupons / discounts (CRUD, coupon codes, limits, free-ship) | **Complete** | `promo-actions.ts::savePromotion`/`deletePromotion`, `promotions-engine.ts` (code entry, usage limits, free shipping), `promotions-manager.tsx` |
| Banners / homepage content (CRUD) | **Complete** | `promo-actions.ts::saveBanner`/`deleteBanner`, `banners-manager.tsx` |
| Reviews moderation (approve/unapprove/delete) | **Complete** | `review-actions.ts`, `reviews-moderation.tsx` |
| Store settings (shipping, tax, contact, social) | **Complete** | `settings-actions.ts::updateSettings`, `settings-form.tsx` |
| Staff roles & permissions (invite, set role/perms, remove) | **Partially implemented** | `staff-actions.ts` (`inviteStaff`/`setStaff`/`removeStaff`), `staff-manager.tsx`. `inviteStaff` backend behaviour (invite email / auth row) — **confirm** |
| Admin auth & access control (middleware + `requireAdmin` + `requirePerm` + RLS) | **Complete** | `guards.ts`, `middleware.ts`, RLS policies in migrations |
| Audit log (view) | **Complete** | `audit/page.tsx`, `audit-table.tsx`; writes from every action |
| Delivery / shipping settings | **Partial** | Flat shipping + free-ship threshold in store settings; delivery **methods/fees are code constants** (`lib/checkout/delivery.ts`) — **not admin-editable** |
| Reports & analytics (beyond dashboard) | **Needs improvement** | Only the dashboard range view; no exportable reports, no dedicated date-range analytics/tax page |
| Wishlist admin | **N/A (by design)** | Wishlists are owner-scoped; no admin requirement identified |

### Cross-cutting observations (verified)

- **Validation coverage uneven.** `productSchema`, `checkoutSchema`,
  `addressBookSchema` exist. Several admin actions (`category`, `promotion`,
  `banner`, `settings`) parse `raw: unknown` — confirm each has a zod schema;
  `inviteStaff`/`setStaff` take loosely-typed args — **no verified schema**.
- **Demo mode:** admin writes no-op / error-toast by design when `hasSupabase()`
  is false — so **no admin write path has been browser-verified against a real
  backend** (Supabase not yet connected).
- **Tests:** only 3 unit suites (`pricing`, `state-machine`, `address`). **No
  tests for admin server actions, permission guards, or CSV import.**
- **Permission strings** (`products:write`, `orders:write`, `refunds:create`,
  `inventory:write`, `promotions:write`, `customers:write`, `staff:write`,
  `settings:write`) are defined ad hoc at call sites — no central registry.

---

## Phase 2 — Remaining work (derived from the audit)

1. **Missing essential feature:** Bundle / School Pack admin CRUD (top priority —
   explicitly deferred; schema + storefront already exist).
2. **Incomplete features:** Staff invite flow (verify/complete backend);
   admin-editable delivery methods & fees.
3. **Needs improvement:** Reports & analytics (exportable, date-ranged);
   collection storefront consumption.
4. **Security / permissions:** central permission registry; verify
   `inviteStaff`/`setStaff` input validation and last-admin / self-demotion
   guards.
5. **Data consistency / inventory:** confirm refund→restock and inventory
   `reserved`/`on_hand` integrity under concurrent writes; bundle delete vs
   `bundle_items` cascade (verified cascade in schema).
6. **Validation & error handling:** zod schemas for category/promotion/banner/
   settings/staff inputs; uniform action error surfaces.
7. **Tests:** admin action + guard + CSV-import unit tests; a connected-backend
   smoke pass once Supabase is live.
8. **UX:** bundle builder UI (product picker + qty), reports export, consistent
   empty/loading states.

Avoid duplicating what exists — products, orders, refunds, inventory, promotions,
banners, reviews, categories, customers, staff, settings, audit, dashboard are
**already implemented**.

---

## Phase 3 — Prioritized task roadmap

### Phase A — Close the explicit gap

| ID | Objective | Depends on | Status |
|---|---|---|---|
| TASK-ADMIN-001 | **Bundle / School Pack admin CRUD** — list, create, edit, delete, publish/draft, item builder (product+variant+qty), curated price | — | ☐ |

### Phase B — Harden existing admin

| ID | Objective | Depends on | Status |
|---|---|---|---|
| TASK-ADMIN-002 | Central **permission registry** + guards (last-admin / self-demotion protection); verify `inviteStaff`/`setStaff` | — | ☐ |
| TASK-ADMIN-003 | **Zod validation** for category / promotion / banner / settings / staff actions + uniform error surfacing | 002 | ☐ |
| TASK-ADMIN-004 | **Admin action unit tests** (guards, CSV import, state transitions, bundle CRUD) | 001, 003 | ☐ |

### Phase C — Complete partial features

| ID | Objective | Depends on | Status |
|---|---|---|---|
| TASK-ADMIN-005 | **Admin-editable delivery methods & fees** (migrate `delivery.ts` constants → store settings) | 003 | ☐ |
| TASK-ADMIN-006 | **Reports & analytics** page — date-ranged sales/tax/product reports + CSV export | — | ☐ |

### Phase D — Enhancements (optional)

| ID | Objective | Depends on | Status |
|---|---|---|---|
| TASK-ADMIN-007 | Bundle builder UX polish (search picker, live pricing preview) | 001 | ☐ |
| TASK-ADMIN-008 | Connected-backend admin smoke verification (once Supabase live) | 001–006 | ☐ |

### Dependencies (summary)

- 001 → 004, 007
- 002 → 003 → 004, 005
- 006 independent; 008 last (needs a live backend).

---

## Recommended first task: **TASK-ADMIN-001 — Bundle / School Pack admin CRUD**

**Why first:** explicitly deferred in TASK-007; the schema (`bundles`,
`bundle_items`, RLS via `products:write`), storefront pages, and pricing logic
(`bundlePricing`) already exist, so this is additive admin UI + actions over a
stable foundation — self-contained and high value.

**Objective:** full admin CRUD for bundles/school packs: list, create, edit,
delete, publish/draft toggle, and an item builder (add existing product +
optional variant + quantity + position), with optional curated price and
grade/age labels.

**Scope / likely files**
- Route: `src/app/admin/bundles/page.tsx` (+ `[id]`, `new` as needed).
- Actions: `src/lib/admin/bundle-actions.ts` (`saveBundle`, `deleteBundle`,
  `setBundleStatus`, bundle-item upsert/remove) — mirror `product-actions.ts`
  (`requirePerm("products:write")`, `audit_logs`, `revalidatePath`
  `/admin/bundles` + `/bundles`).
- Queries: `getAdminBundles`/`getAdminBundle` in `lib/admin/catalog-queries.ts`.
- Validation: `src/lib/validation/bundle.ts` (`bundleSchema`).
- UI: `src/components/admin/bundles-manager.tsx` + form with product picker;
  nav item in `admin-nav.tsx` (`perm: "products:write"`).
- Demo data: admin bundle fixtures in `lib/demo/data.ts`.

**Acceptance criteria**
- Admin can create/edit/delete bundles and toggle published/draft; item builder
  adds/removes products with variant + qty + position; curated price optional.
- `products:write` gated (action + nav); every write audited; paths revalidated
  so storefront `/bundles` reflects changes.
- Demo mode: list renders from fixtures, writes no-op with the standard message.
- No schema change required (tables exist); if a column is missing, add a new
  migration `0012_*` — never edit existing migrations.

**Testing**
- `npm run typecheck`, `npm run build`, `npm test` pass.
- New unit tests for `bundleSchema` + bundle-item normalization.
- Browser check (demo mode): `/admin/bundles` lists, form opens, no-op write
  toasts; nav item visible/perm-gated.

**No change to:** customer-facing `/bundles` behaviour or `bundlePricing`.

---

## Phase 4 — Documentation plan

**Do not overwrite** existing docs. TASK-001–TASK-010 history stays intact.

- **This file** (`docs/ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md`) — the admin
  roadmap and per-task records (new). Mirrors the customer plan's structure.
- **`PROGRESS.md`** — append admin tasks under *Recently completed* / *Current
  work* as they land; bump *Last updated* / *Last commit*. Keep customer entries
  untouched.
- **`docs/PROJECT_MAP.md`** — update the admin section only when new
  routes/modules are added (e.g. `admin/bundles`).

**Each completed admin task must record** (in this file): what was implemented;
files added/modified; acceptance-criteria results; tests performed + results;
remaining limitations; commit reference (when committed).

---

## Workflow rules (carried over)

- One admin task per conversation; **stop after planning — await approval before
  implementing TASK-ADMIN-001.**
- Money in integer minor units; demo-mode fallback via `hasSupabase()`.
- Keep the 3 schema copies in step (`migrations/*`, `seed.sql`, `setup.sql`);
  add new migrations, never edit old ones.
- Defense in depth preserved (middleware + `requirePerm` + RLS); audit every
  write.
