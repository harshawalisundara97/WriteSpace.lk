# WriteSpace.lk

Online stationery store (kids + adults) — motion-rich storefront + full admin dashboard.
Next.js (App Router) · Supabase · Stripe (PayHere-ready) · Tailwind + shadcn/ui.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Local setup

1. Install deps:
   ```bash
   npm install
   ```
2. Create a Supabase project (free tier), then copy env:
   ```bash
   cp .env.example .env
   ```
   Fill in the Supabase URL + keys, Stripe test keys, and Resend key.
3. Apply the database schema and seed data:
   ```bash
   # with the Supabase CLI linked to your project
   supabase db push                 # runs migrations in supabase/migrations
   npm run db:seed                  # loads sample products
   ```
   (Or paste the SQL files from `supabase/migrations/` then `supabase/seed.sql`
   into the Supabase SQL editor, in order.)
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.

## Deploy (Netlify — commercial use OK)

- Connect the repo in Netlify; it auto-detects Next.js.
- Set all env vars from `.env.example` in Netlify project settings.
- Point the Stripe webhook at `https://<your-domain>/api/webhooks/stripe`.
- Schedule the reservation sweep (Netlify scheduled function or Supabase cron)
  to call `sweep_expired_reservations()` every few minutes.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright E2E |

## Money

All amounts are stored and computed as **integer minor units** (LKR cents).
Formatting happens only at display via `src/lib/pricing/money.ts`.
