-- Delivery method chosen at checkout — TASK-009
-- standard | express | pickup. Fees are resolved in code
-- (src/lib/checkout/delivery.ts) and snapshotted into orders.shipping_minor.
alter table orders
  add column if not exists delivery_method text not null default 'standard'
  check (delivery_method in ('standard', 'express', 'pickup'));
