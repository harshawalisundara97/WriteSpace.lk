-- B2B / office quotes — TASK-NEXT-009a
-- Shopper requests a quote from the cart; admin prices each line (and optional
-- shipping), sends it; shopper accepts before valid_until → converted to an order.
-- Rules: src/lib/quotes/rules.ts. Writes are server-side only (service role).
do $$ begin
  create type quote_status as enum ('requested', 'priced', 'accepted', 'converted', 'declined', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  customer_id uuid references customers(id) on delete set null,
  status quote_status not null default 'requested',
  company text check (company is null or char_length(company) <= 120),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text,
  notes text check (notes is null or char_length(notes) <= 1000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  shipping_minor int not null default 0 check (shipping_minor >= 0),
  subtotal_minor int not null default 0 check (subtotal_minor >= 0),
  total_minor int not null default 0 check (total_minor >= 0),
  valid_until timestamptz,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quotes_status on quotes(status, created_at desc);
create index if not exists idx_quotes_customer on quotes(customer_id);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  name text not null,
  sku text,
  qty int not null check (qty > 0 and qty <= 10000),
  -- Catalogue/tier price at request time; admin sets quoted_unit_minor.
  list_unit_minor int not null check (list_unit_minor >= 0),
  quoted_unit_minor int check (quoted_unit_minor is null or quoted_unit_minor >= 0)
);
create index if not exists idx_quote_items_quote on quote_items(quote_id);

alter table quotes enable row level security;
alter table quote_items enable row level security;
drop policy if exists quotes_self_read on quotes;
create policy quotes_self_read on quotes for select using (customer_id = auth.uid() or is_admin());
drop policy if exists quote_items_read on quote_items;
create policy quote_items_read on quote_items for select using (
  exists (select 1 from quotes q where q.id = quote_id and (q.customer_id = auth.uid() or is_admin()))
);
