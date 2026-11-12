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
| TASK-002 | About page | 001 | ☐ |
| TASK-003 | Contact page + enquiry form (Resend) | 001 | ☐ |
| TASK-004 | FAQ page (stationery-focused) | 001 | ☐ |
| TASK-005 | Stationery product specifications (GSM, paper size, ruling, sheet count, colour) — schema + PDP spec table | — | ☐ |
| TASK-006 | Spec-based catalog filters for the new attributes | 005 | ☐ |
| TASK-007 | Bundles & school packs (curated / grade packs) | 005 | ☐ |
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
