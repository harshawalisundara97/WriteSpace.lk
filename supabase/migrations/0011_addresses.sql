-- Saved delivery address book, per signed-in customer — TASK-010.
-- Mirrors the checkout delivery fields; a customer can keep several and mark one
-- default. Single-default is enforced in the server action (unset others on save),
-- not here, to stay simple and demo-safe.
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  postal_code text,
  country text not null default 'LK',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_addresses_customer on addresses(customer_id);
create trigger t_addresses_updated before update on addresses for each row execute function set_updated_at();

alter table addresses enable row level security;
create policy address_owner_all on addresses for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
