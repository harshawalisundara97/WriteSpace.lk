-- TASK-008: bulk ordering — per-product price tiers.
-- Array of {min_qty, discount_bps}: when a cart line's quantity reaches min_qty,
-- discount_bps (basis points, 1% = 100 bps) comes off each unit's price. Applied
-- as a percentage so it works across variants at different base prices.
alter table products
  add column if not exists price_tiers jsonb not null default '[]'::jsonb;
