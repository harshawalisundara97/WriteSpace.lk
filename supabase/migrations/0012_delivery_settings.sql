-- Admin-editable delivery methods & fees — TASK-ADMIN-005
-- Standard is always offered (flat_shipping_minor / free-shipping threshold).
-- Express = flat_shipping_minor + express_surcharge_minor; pickup is free.
-- Null descriptions fall back to the default copy in src/lib/checkout/delivery.ts.
alter table store_settings add column if not exists express_surcharge_minor int not null default 40000
  check (express_surcharge_minor >= 0);
alter table store_settings add column if not exists express_enabled boolean not null default true;
alter table store_settings add column if not exists pickup_enabled boolean not null default true;
alter table store_settings add column if not exists standard_description text;
alter table store_settings add column if not exists express_description text;
alter table store_settings add column if not exists pickup_description text;
