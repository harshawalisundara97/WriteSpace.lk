-- Gift wrap & message — TASK-NEXT-007
-- Admin-priced flat gift-wrap fee; message printed on the packing slip.
-- Rules: src/lib/checkout/gift.ts.
alter table store_settings add column if not exists gift_wrap_enabled boolean not null default false;
alter table store_settings add column if not exists gift_wrap_fee_minor int not null default 25000
  check (gift_wrap_fee_minor >= 0);

alter table orders add column if not exists gift_wrap boolean not null default false;
-- Fee snapshotted at checkout (already included in total_minor).
alter table orders add column if not exists gift_wrap_minor int not null default 0
  check (gift_wrap_minor >= 0);
alter table orders add column if not exists gift_message text
  check (gift_message is null or char_length(gift_message) <= 200);
