-- Guest order tracking — TASK-NEXT-003
-- Admin records the courier and (optionally) a tracking link; /track shows them
-- with a status timeline built from audit_logs. Rules: src/lib/orders/tracking.ts.
alter table orders add column if not exists courier text
  check (courier is null or courier in ('domex', 'pronto', 'koombiyo', 'slpost', 'other'));
alter table orders add column if not exists tracking_url text
  check (tracking_url is null or tracking_url ~* '^https?://');
