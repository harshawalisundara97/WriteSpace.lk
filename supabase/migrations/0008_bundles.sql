-- Bundles & school packs (curated / grade packs) — TASK-007
-- A bundle is a curated set of existing products (each with a quantity) sold
-- together, with an optional curated price. Mirrors the collections pattern.

create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  age_group age_group not null default 'all',
  grade_label text,                                   -- e.g. "Grade 1–3", "Office starter"
  image_url text,
  bundle_price_minor int check (bundle_price_minor >= 0),  -- null = sum of item prices (no discount)
  is_featured boolean not null default false,
  position int not null default 0,
  status product_status not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists idx_bundles_status on bundles(status);

create table if not exists bundle_items (
  bundle_id uuid references bundles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,  -- specific variant; null = product's first variant
  quantity int not null default 1 check (quantity > 0),
  position int not null default 0,
  primary key (bundle_id, product_id)
);
create index if not exists idx_bundle_items_bundle on bundle_items(bundle_id);

-- RLS: public reads published bundles; admins manage (products:write).
alter table bundles      enable row level security;
alter table bundle_items enable row level security;

create policy pub_read_bundles on bundles for select
  using (status = 'published' or is_admin());
create policy pub_read_bundle_items on bundle_items for select using (true);

create policy admin_write_bundles on bundles for all
  using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_bundle_items on bundle_items for all
  using (has_perm('products:write')) with check (has_perm('products:write'));
