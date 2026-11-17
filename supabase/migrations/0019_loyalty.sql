-- Loyalty points — TASK-NEXT-008a
-- Earn 1 pt per LKR 100 of merchandise (after discounts) on delivered orders;
-- 1 pt = LKR 1 off at checkout, capped at a % of subtotal; points expire
-- 12 months after they were earned (FIFO). All rates admin-editable.
-- Rules: src/lib/loyalty/rules.ts. Ledger writes are server-side only (service role).
alter table store_settings add column if not exists loyalty_enabled boolean not null default false;
alter table store_settings add column if not exists loyalty_earn_per_minor int not null default 10000
  check (loyalty_earn_per_minor > 0);
alter table store_settings add column if not exists loyalty_point_value_minor int not null default 100
  check (loyalty_point_value_minor > 0);
alter table store_settings add column if not exists loyalty_max_redeem_pct int not null default 50
  check (loyalty_max_redeem_pct between 0 and 100);
alter table store_settings add column if not exists loyalty_expiry_months int not null default 12
  check (loyalty_expiry_months between 0 and 120); -- 0 = never expire

-- Append-only ledger. Balance = unexpired credits minus debits, consumed FIFO.
create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  kind text not null check (kind in ('earn', 'redeem', 'adjust', 'reverse')),
  points int not null check (points <> 0),
  expires_at timestamptz,
  note text check (note is null or char_length(note) <= 200),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_loyalty_customer on loyalty_ledger(customer_id, created_at);
-- One earn entry per order.
create unique index if not exists uq_loyalty_earn_order on loyalty_ledger(order_id) where kind = 'earn';

alter table orders add column if not exists loyalty_points_redeemed int not null default 0
  check (loyalty_points_redeemed >= 0);
-- Discount snapshotted at checkout (already deducted from total_minor).
alter table orders add column if not exists loyalty_discount_minor int not null default 0
  check (loyalty_discount_minor >= 0);

alter table loyalty_ledger enable row level security;
drop policy if exists loyalty_self_read on loyalty_ledger;
create policy loyalty_self_read on loyalty_ledger for select using (customer_id = auth.uid() or is_admin());
