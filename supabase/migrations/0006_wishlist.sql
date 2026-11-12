-- Server-backed wishlist (saved products), synced to the signed-in account.
create table if not exists wishlists (
  customer_id uuid not null references customers(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);
create index if not exists idx_wishlists_customer on wishlists(customer_id);

alter table wishlists enable row level security;
create policy wishlist_owner_all on wishlists for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
