-- Cash on Delivery — TASK-NEXT-002
-- Rules live in src/lib/checkout/cod.ts. COD orders commit stock at checkout,
-- stay 'pending_payment' (awaiting payment) and are marked paid on delivery.
alter table store_settings add column if not exists cod_enabled boolean not null default false;
alter table store_settings add column if not exists cod_fee_minor int not null default 15000
  check (cod_fee_minor >= 0);
alter table store_settings add column if not exists cod_max_order_minor int default 2500000
  check (cod_max_order_minor is null or cod_max_order_minor >= 0);
alter table store_settings add column if not exists cod_districts text[] not null default array[
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
  'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
  'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
]::text[];

alter table orders add column if not exists payment_method text not null default 'online'
  check (payment_method in ('online', 'cod'));
-- COD fee snapshotted at checkout (already included in total_minor).
alter table orders add column if not exists cod_fee_minor int not null default 0
  check (cod_fee_minor >= 0);
