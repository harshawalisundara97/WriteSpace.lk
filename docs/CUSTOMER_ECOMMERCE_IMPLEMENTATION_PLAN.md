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
