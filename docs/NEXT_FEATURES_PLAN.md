# WriteSpace.lk — Next Features Plan

> Drafted 2026-11-16, after the customer plan (TASK-001–010) and admin plan
> (TASK-ADMIN-001–007) were complete and TASK-ADMIN-008 (live-backend smoke) was
> mostly done. One task per conversation; stop after each and await approval.
> Conventions (minor-unit money, demo mode, 3 schema copies, middleware +
> `requirePerm` + RLS, audit every write) apply to every task below.

## Priorities

1. **Finish & launch-proof** — close 008, make payments real for Sri Lanka.
2. **Revenue for the core customer** — parents buying school supplies.
3. **Retention** — bring customers back without paid ads.
4. **Reach** — Sinhala / Tamil, B2B.

## Task list

| ID | Feature | Why | Depends | Size | Status |
|---|---|---|---|---|---|
| TASK-ADMIN-008b | **Finish smoke test**: permission refusal returns `{ ok:false }` + toast (not error page); UI-test product edit, staff invite/role, reports as admin + staff | Closes 008 | — | S | ☑ |
| TASK-NEXT-001 | **PayHere live gateway** (implement `payhere.ts` behind `PaymentProvider`: checkout redirect, MD5 signature, notify webhook, refunds via admin) — split 001a redirect ☑ · 001b notify ☐ · 001c refunds ☐ · 001d sandbox E2E ☐ | Local cards/eZ Cash; Stripe LKR support is an open question (PROGRESS.md) | 008b | L | ◐ |
| TASK-NEXT-002 | **Cash on Delivery** (admin toggle + COD fee + max order value; order "awaiting payment" until delivered) | Most common payment for SL e-commerce | 001 | M | ◐ |
| TASK-NEXT-003 | **Guest order tracking** (`/track` — order no. + email/phone, status timeline, courier tracking link added by admin) | Cuts "where is my order" contact | — | S | ◐ |
| TASK-NEXT-004 | **School book-list → cart** — split 004a matcher ☑ · 004b review page ☑ · 004c admin saved lists ☐ · 004d school/grade picker ☐ (parent pastes a school list; fuzzy-match to products via `searchProducts`; review & add all; admin saves lists per school/grade) | Core seasonal (Jan) demand; builds on bundles | — | L | ◐ |
| TASK-NEXT-005 | **Back-in-stock alerts** (notify-me on out-of-stock PDP; Resend email when stock > 0; admin sees demand per product) | Recovers lost sales; restock signal | — | M | ◐ |
| TASK-NEXT-006 | **Abandoned-cart email** (cron finds signed-in carts idle > 24h; one reminder; unsubscribe) | Retention; cron infra exists (`CRON_SECRET`) | — | M | ◐ |
| TASK-NEXT-007 | **Gift wrap & message** at checkout (admin-priced option, message on packing slip) | Higher order value | — | S | ◐ |
| TASK-NEXT-008 | **Loyalty points** — split 008a rules+schema ☑ · 008b earn on delivered + refund reversal + account balance ☑ · 008c redeem at checkout + restore on cancel ☑ · 008d admin settings/adjust + audit ☑ (earn per LKR, redeem at checkout, ledger table, admin adjust + audit) | Repeat purchase | 002 | L | ☑ |
| TASK-NEXT-009 | **B2B / office quotes** — split 009a rules+schema ☑ · 009b request from cart ☑ · 009c admin pricing + email + buyer view link ☑ · 009d accept → invoice order + printable quote ☑ | Offices & schools buy in bulk; extends tiered pricing | — | L | ☑ |
| TASK-NEXT-010 | **Sinhala & Tamil UI** — split 010a framework + drafted dictionaries + `<html lang>` ☑ · 010b translate header/footer/cart + switcher ☑ · 010c `?lang=` + hreflang + per-locale canonical ☑ · 010d native-speaker review ☐ | Reach beyond English-first shoppers | — | L | ◐ |

Size: S ≈ one sitting, M ≈ 1–2, L ≈ 3+ (split into sub-tasks before starting).

## Recommended order

008b → 001 → 002 → 003 → 004 (ship before January back-to-school) → 005 → 006 → 007 → 008 → 009 → 010.

## Open decisions (owner input needed before the task starts)

- **001:** PayHere merchant (sandbox) account; keep Stripe as a second option?
- **002:** ~~COD fee, max COD order value, which areas allow COD.~~ Decided 2026-11-16: LKR 150 flat, max LKR 25,000 (before fee), admin-picked districts (all 25 on by default); all admin-editable.
- **003:** ~~Couriers; manual links or API?~~ Decided 2026-11-16: manual — admin picks courier (Domex, Pronto, Koombiyo, SL Post, Other) + tracking no. + optional link.
- **004:** ~~Photo upload (OCR) or paste only?~~ Decided 2026-11-16: paste-only for v1.
- **008:** ~~Earn/redeem rates and expiry.~~ Decided 2026-11-17: 1 pt per LKR 100 (delivered orders), 1 pt = LKR 1, max 50% of subtotal, 12-month expiry; all admin-editable.
- **010:** ~~Who provides translations.~~ Decided 2026-11-17: Claude drafts si/ta; native-speaker review before launch (010d).

## Definition of done (every task)

Typecheck + unit tests + build pass; new schema as a new migration mirrored in
`setup.sql`/`seed.sql`; demo-mode path works; writes audited; checked against local
Supabase (see TASK-ADMIN-008) and in the browser; `PROGRESS.md` updated; committed
after approval.
