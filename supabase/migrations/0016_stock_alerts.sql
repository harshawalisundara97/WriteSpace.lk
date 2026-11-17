-- Back-in-stock alerts — TASK-NEXT-005
-- Shopper leaves an email on an out-of-stock variant; when stock is added back
-- (admin adjust / CSV import) one email goes out and notified_at is set.
-- Rules: src/lib/stock-alerts/. Writes are server-side only (service role).
create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_id uuid references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
-- One pending alert per email + variant (re-subscribing after a notification is allowed).
create unique index if not exists uq_stock_alerts_pending
  on stock_alerts(variant_id, lower(email)) where notified_at is null;
create index if not exists idx_stock_alerts_variant on stock_alerts(variant_id) where notified_at is null;

alter table stock_alerts enable row level security;
drop policy if exists stock_alerts_admin_read on stock_alerts;
create policy stock_alerts_admin_read on stock_alerts for select using (is_admin());
