-- B2B quotes → orders — TASK-NEXT-009d
-- Buyer accepts a priced quote online, giving a delivery address and optional PO
-- number; staff convert it into an order paid by invoice (bank transfer):
-- stock committed at conversion, fulfil/ship before payment, mark paid later.
alter table quotes add column if not exists delivery_address jsonb;
alter table quotes add column if not exists po_number text check (po_number is null or char_length(po_number) <= 60);
alter table quotes add column if not exists accepted_at timestamptz;

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check check (payment_method in ('online', 'cod', 'invoice'));
alter table orders add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table orders add column if not exists po_number text check (po_number is null or char_length(po_number) <= 60);
create unique index if not exists uq_orders_quote on orders(quote_id) where quote_id is not null;
