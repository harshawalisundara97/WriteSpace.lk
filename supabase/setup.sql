-- WriteSpace.lk — one-shot database setup
-- Paste this whole file into the Supabase SQL editor and Run.
-- It creates the schema, RLS, functions, storage bucket, and seed data.

-- ========== 0001_schema ==========
-- WriteSpace.lk — core schema
-- Money is ALWAYS integer minor units (cents). Currency stored per order.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- enums ----------
create type age_group as enum ('kids', 'adults', 'all');
create type product_status as enum ('draft', 'published');
create type order_status as enum (
  'pending_payment','paid','fulfilled','shipped','delivered',
  'cancelled','refunded','partially_refunded'
);
create type payment_status as enum ('requires_payment','succeeded','failed','refunded','partially_refunded');
create type refund_status as enum ('pending','succeeded','failed');
create type promo_type as enum ('percentage','fixed','bxgy','free_shipping');
create type app_role as enum ('customer','staff','admin');
create type inventory_reason as enum ('manual_adjust','order_decrement','order_restock','reservation','reservation_release');

-- ---------- helper: updated_at ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------- customers (mirror of auth.users) ----------
create table customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_customers_updated before update on customers for each row execute function set_updated_at();

-- ---------- admin_users (role + granular permissions) ----------
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'staff',
  permissions jsonb not null default '[]'::jsonb,  -- e.g. ["orders:write","refunds:create"]
  created_at timestamptz not null default now()
);

-- ---------- categories (nested) ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  age_group age_group not null default 'all',
  position int not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_categories_updated before update on categories for each row execute function set_updated_at();
create index idx_categories_parent on categories(parent_id);

-- ---------- collections ----------
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_featured boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- products ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  age_group age_group not null default 'all',
  status product_status not null default 'draft',
  images jsonb not null default '[]'::jsonb,       -- [{url, alt}] in Supabase Storage
  specs jsonb not null default '{}'::jsonb,
  price_tiers jsonb not null default '[]'::jsonb,  -- [{min_qty, discount_bps}] bulk tiers
  seo_title text,
  seo_description text,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_products_updated before update on products for each row execute function set_updated_at();
create index idx_products_category on products(category_id);
create index idx_products_status on products(status);
create index idx_products_search on products using gin(search_vector);
create index idx_products_name_trgm on products using gin(name gin_trgm_ops);

create or replace function products_search_vector() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.brand,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C');
  return new;
end;
$$ language plpgsql;
create trigger t_products_search before insert or update of name, brand, description
  on products for each row execute function products_search_vector();

create table product_collections (
  product_id uuid references products(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

-- ---------- variants ----------
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  name text,                                   -- e.g. "A5 / Blue"
  options jsonb not null default '{}'::jsonb,   -- {size:"A5", color:"Blue"}
  price_minor int not null check (price_minor >= 0),
  compare_at_minor int check (compare_at_minor >= 0),  -- strike-through
  currency char(3) not null default 'LKR',
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_variants_product on product_variants(product_id);

-- ---------- inventory (1:1 per variant) ----------
create table inventory (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  low_stock_threshold int not null default 5,
  updated_at timestamptz not null default now()
);
create trigger t_inventory_updated before update on inventory for each row execute function set_updated_at();

create table inventory_ledger (
  id bigint generated always as identity primary key,
  variant_id uuid not null references product_variants(id) on delete cascade,
  change int not null,
  reason inventory_reason not null,
  note text,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_inv_ledger_variant on inventory_ledger(variant_id);

-- ---------- carts ----------
create table carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade, -- null = guest
  anon_token text,                                             -- for guest carts
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_carts_updated before update on carts for each row execute function set_updated_at();
create index idx_carts_customer on carts(customer_id);
create index idx_carts_anon on carts(anon_token);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ---------- promotions ----------
create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type promo_type not null,
  value int not null default 0,          -- percentage(0-100) OR fixed minor OR bxgy meta
  code text unique,                       -- null = automatic
  meta jsonb not null default '{}'::jsonb,-- bxgy: {buy_qty, get_qty, variant/category scope}
  min_subtotal_minor int not null default 0,
  usage_limit int,                        -- null = unlimited
  per_customer_limit int,
  stackable boolean not null default false,
  priority int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_promotions_updated before update on promotions for each row execute function set_updated_at();
create index idx_promotions_code on promotions(code);

create table promotion_redemptions (
  id bigint generated always as identity primary key,
  promotion_id uuid not null references promotions(id) on delete cascade,
  order_id uuid,
  customer_id uuid references customers(id) on delete set null,
  amount_minor int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_promo_redemptions_promo on promotion_redemptions(promotion_id);
create index idx_promo_redemptions_customer on promotion_redemptions(customer_id);

-- ---------- banners / ads ----------
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  placement text not null default 'home_hero', -- home_hero | promo_strip | category
  position int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references customers(id) on delete set null,
  email text not null,
  status order_status not null default 'pending_payment',
  currency char(3) not null default 'LKR',
  subtotal_minor int not null default 0,
  discount_minor int not null default 0,
  shipping_minor int not null default 0,
  tax_minor int not null default 0,
  total_minor int not null default 0,
  shipping_address jsonb,
  delivery_method text not null default 'standard' check (delivery_method in ('standard', 'express', 'pickup')),  -- TASK-009
  tracking_number text,
  notes text,
  idempotency_key text unique,
  reserved_until timestamptz,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_orders_updated before update on orders for each row execute function set_updated_at();
create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,   -- snapshot
  sku text not null,            -- snapshot
  unit_price_minor int not null,-- snapshot
  quantity int not null check (quantity > 0),
  line_total_minor int not null
);
create index idx_order_items_order on order_items(order_id);

-- ---------- payments ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'stripe',     -- stripe | payhere
  provider_payment_id text,
  status payment_status not null default 'requires_payment',
  amount_minor int not null,
  currency char(3) not null default 'LKR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_payments_updated before update on payments for each row execute function set_updated_at();
create index idx_payments_order on payments(order_id);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  provider_refund_id text,
  amount_minor int not null check (amount_minor > 0),
  reason text,
  status refund_status not null default 'pending',
  restocked boolean not null default false,
  idempotency_key text unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_refunds_order on refunds(order_id);

-- webhook idempotency
create table webhook_events (
  id text primary key,          -- provider event id
  provider text not null,
  processed_at timestamptz not null default now()
);

-- ---------- audit log ----------
create table audit_logs (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,         -- e.g. order.refund, product.update
  entity text not null,         -- table name
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity, entity_id);
create index idx_audit_created on audit_logs(created_at desc);

-- ---------- reviews (deferred feature, table ready) ----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);
create index idx_reviews_product on reviews(product_id);

-- ---------- settings (single row) ----------
create table store_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'WriteSpace.lk',
  currency char(3) not null default 'LKR',
  flat_shipping_minor int not null default 35000,  -- LKR 350.00
  free_shipping_threshold_minor int,                -- null = never free
  tax_rate_bps int not null default 0,              -- basis points (0 = none)
  support_email text,
  support_phone text,
  whatsapp text,
  address text,
  instagram_url text,
  facebook_url text,
  updated_at timestamptz not null default now()
);
insert into store_settings (id) values (1) on conflict do nothing;

-- new-customer trigger: mirror auth.users -> customers
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.customers (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ========== 0002_rls ==========
-- WriteSpace.lk — Row Level Security
-- Principle: public can READ published catalog only. Customers see only their own
-- cart/orders. All writes to catalog/orders/financial tables go through server code
-- using the service-role key (which bypasses RLS) or explicit admin policies.

-- helper: is the current user an admin or staff?
create or replace function is_admin() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function is_admin_role() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public;

create or replace function has_perm(perm text) returns boolean as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid()
      and (role = 'admin' or permissions ? perm)
  );
$$ language sql stable security definer set search_path = public;

-- enable RLS everywhere
alter table customers              enable row level security;
alter table admin_users            enable row level security;
alter table categories             enable row level security;
alter table collections            enable row level security;
alter table products               enable row level security;
alter table product_collections    enable row level security;
alter table product_variants       enable row level security;
alter table inventory              enable row level security;
alter table inventory_ledger       enable row level security;
alter table carts                  enable row level security;
alter table cart_items             enable row level security;
alter table promotions             enable row level security;
alter table promotion_redemptions  enable row level security;
alter table banners                enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table payments               enable row level security;
alter table refunds                enable row level security;
alter table webhook_events         enable row level security;
alter table audit_logs             enable row level security;
alter table reviews                enable row level security;
alter table store_settings         enable row level security;

-- ---------- public read: catalog ----------
create policy pub_read_categories  on categories  for select using (true);
create policy pub_read_collections on collections for select using (true);
create policy pub_read_banners on banners for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy pub_read_products on products for select
  using (status = 'published' or is_admin());
create policy pub_read_variants on product_variants for select
  using (is_active or is_admin());
create policy pub_read_pcoll on product_collections for select using (true);
create policy pub_read_inventory on inventory for select using (true); -- stock badges
create policy pub_read_settings on store_settings for select using (true);
create policy pub_read_reviews on reviews for select using (is_approved or is_admin());
-- public can read active promo definitions only via server (no public policy → default deny)

-- ---------- customers ----------
create policy cust_self_read on customers for select using (id = auth.uid() or is_admin());
create policy cust_self_update on customers for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- reviews: customer writes own ----------
create policy rev_insert_own on reviews for insert with check (customer_id = auth.uid());
create policy rev_update_own on reviews for update using (customer_id = auth.uid());

-- ---------- carts & items: owner (auth) only; guests handled server-side ----------
create policy cart_owner_all on carts for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy cart_items_owner_all on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.customer_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.customer_id = auth.uid()));

-- ---------- orders: customer reads own; writes server-side only ----------
create policy order_read_own on orders for select
  using (customer_id = auth.uid() or is_admin());
create policy order_items_read_own on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin())));
create policy payments_read_own on payments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin())));
create policy refunds_read_own on refunds for select
  using (exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin())));

-- ---------- admin-managed tables (write via admin policies; reads for admins) ----------
-- Catalog writes
create policy admin_write_categories on categories for all using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_collections on collections for all using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_products on products for all using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_pcoll on product_collections for all using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_variants on product_variants for all using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_inventory on inventory for all using (has_perm('inventory:write')) with check (has_perm('inventory:write'));
create policy admin_read_inv_ledger on inventory_ledger for select using (is_admin());
create policy admin_write_inv_ledger on inventory_ledger for insert with check (has_perm('inventory:write'));
create policy admin_write_banners on banners for all using (has_perm('promotions:write')) with check (has_perm('promotions:write'));
create policy admin_all_promotions on promotions for all using (has_perm('promotions:write')) with check (has_perm('promotions:write'));
create policy admin_read_promo_redemptions on promotion_redemptions for select using (is_admin());

-- Orders / financial: admins read all; status changes go through RPC/server but allow admin update with perm
create policy admin_update_orders on orders for update using (has_perm('orders:write')) with check (has_perm('orders:write'));
create policy admin_insert_refunds on refunds for insert with check (has_perm('refunds:create'));

-- admin_users: only admins manage
create policy admin_read_admins on admin_users for select using (is_admin());
create policy admin_manage_admins on admin_users for all using (has_perm('staff:write')) with check (has_perm('staff:write'));

-- audit log: admins read; inserts via server (service role)
create policy admin_read_audit on audit_logs for select using (is_admin_role());

-- settings: admins update
create policy admin_update_settings on store_settings for update using (has_perm('settings:write')) with check (has_perm('settings:write'));

-- webhook_events: no public/customer access (default deny); service role only.

-- ========== 0003_functions ==========
-- WriteSpace.lk — atomic inventory & order RPCs
-- Called from server code (service role). All stock math is transactional
-- and row-locked to prevent overselling under concurrency.

-- Reserve stock for a set of {variant_id, quantity}. Fails if any is short.
-- items: jsonb array [{"variant_id": "...", "quantity": 2}, ...]
create or replace function reserve_stock(items jsonb, hold_minutes int default 15)
returns void as $$
declare
  it jsonb;
  vid uuid;
  qty int;
  avail int;
begin
  -- lock rows in a deterministic order to avoid deadlocks
  for it in select * from jsonb_array_elements(items) order by (value->>'variant_id')
  loop
    vid := (it->>'variant_id')::uuid;
    qty := (it->>'quantity')::int;

    select on_hand - reserved into avail from inventory where variant_id = vid for update;
    if avail is null then
      raise exception 'no inventory row for variant %', vid;
    end if;
    if avail < qty then
      raise exception 'insufficient stock for variant % (need %, available %)', vid, qty, avail
        using errcode = 'P0001';
    end if;

    update inventory set reserved = reserved + qty where variant_id = vid;
    insert into inventory_ledger (variant_id, change, reason) values (vid, -qty, 'reservation');
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Release a reservation (cancel / expiry / payment fail).
create or replace function release_stock(items jsonb)
returns void as $$
declare it jsonb; vid uuid; qty int;
begin
  for it in select * from jsonb_array_elements(items)
  loop
    vid := (it->>'variant_id')::uuid;
    qty := (it->>'quantity')::int;
    update inventory set reserved = greatest(reserved - qty, 0) where variant_id = vid;
    insert into inventory_ledger (variant_id, change, reason) values (vid, qty, 'reservation_release');
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Commit a reservation on payment success: decrement on_hand and release reserved.
create or replace function commit_stock(items jsonb)
returns void as $$
declare it jsonb; vid uuid; qty int;
begin
  for it in select * from jsonb_array_elements(items)
  loop
    vid := (it->>'variant_id')::uuid;
    qty := (it->>'quantity')::int;
    update inventory
      set on_hand = on_hand - qty, reserved = greatest(reserved - qty, 0)
      where variant_id = vid;
    insert into inventory_ledger (variant_id, change, reason) values (vid, -qty, 'order_decrement');
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Restock on refund/cancel after payment.
create or replace function restock(items jsonb, who uuid default null)
returns void as $$
declare it jsonb; vid uuid; qty int;
begin
  for it in select * from jsonb_array_elements(items)
  loop
    vid := (it->>'variant_id')::uuid;
    qty := (it->>'quantity')::int;
    update inventory set on_hand = on_hand + qty where variant_id = vid;
    insert into inventory_ledger (variant_id, change, reason, actor) values (vid, qty, 'order_restock', who);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Sweep expired reservations (run from a scheduled edge function / cron).
create or replace function sweep_expired_reservations()
returns int as $$
declare o record; cnt int := 0;
begin
  for o in
    select id from orders
    where status = 'pending_payment' and reserved_until is not null and reserved_until < now()
    for update skip locked
  loop
    perform release_stock(
      (select jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity))
         from order_items where order_id = o.id and variant_id is not null)
    );
    update orders set status = 'cancelled', reserved_until = null where id = o.id;
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$ language plpgsql security definer set search_path = public;

-- Human-friendly order number: WS-YYYYMMDD-XXXX
create or replace function next_order_number()
returns text as $$
  select 'WS-' || to_char(now(),'YYYYMMDD') || '-' ||
         lpad((floor(random()*9000)+1000)::text, 4, '0');
$$ language sql;

-- ========== 0004_storage ==========
-- Public bucket for product images. Uploads happen server-side via the
-- service-role key (admin product actions), so we only need public READ here.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read of objects in this bucket.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'product_images_public_read'
  ) then
    create policy product_images_public_read on storage.objects
      for select using (bucket_id = 'product-images');
  end if;
end $$;

-- ========== seed data ==========
-- WriteSpace.lk — seed data (sample stationery, kids + adults)
-- Prices are LKR minor units (cents): LKR 1,250.00 => 125000
-- Run after migrations. Idempotent-ish: uses fixed slugs/SKUs.

-- ---------- categories ----------
insert into categories (id, name, slug, age_group, is_featured, position) values
  ('11111111-0000-0000-0000-000000000001','Writing & Pens','writing-pens','all',true,1),
  ('11111111-0000-0000-0000-000000000002','Notebooks & Paper','notebooks-paper','all',true,2),
  ('11111111-0000-0000-0000-000000000003','Art & Craft','art-craft','all',true,3),
  ('11111111-0000-0000-0000-000000000004','Kids Corner','kids-corner','kids',true,4),
  ('11111111-0000-0000-0000-000000000005','Office & Desk','office-desk','adults',true,5)
on conflict (slug) do nothing;

-- ---------- collections ----------
insert into collections (id, name, slug, is_featured, position) values
  ('22222222-0000-0000-0000-000000000001','Back to School','back-to-school',true,1),
  ('22222222-0000-0000-0000-000000000002','New Arrivals','new-arrivals',true,2),
  ('22222222-0000-0000-0000-000000000003','Deals of the Day','deals-of-the-day',true,3)
on conflict (slug) do nothing;

-- ---------- products + variants + inventory ----------
-- helper pattern repeated per product
do $$
declare pid uuid; vid uuid;
begin
  -- 1. Gel pens (kids)
  pid := '33333333-0000-0000-0000-000000000001';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000001','Rainbow Gel Pens (12-pack)','rainbow-gel-pens-12',
    'Smooth-writing glitter gel pens in 12 vivid colours. Perfect for kids'' journals and doodles.',
    'DooWrite','kids','published','[{"url":"/images/gel-pens.jpg","alt":"Rainbow gel pens"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000001';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-GEL-12','12-pack',85000,120000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,120) on conflict do nothing;

  -- 2. Fountain pen (adults)
  pid := '33333333-0000-0000-0000-000000000002';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000001','Classic Fountain Pen','classic-fountain-pen',
    'Brushed-steel fountain pen with a fine nib. Comes gift-boxed with two ink cartridges.',
    'Inkwell','adults','published','[{"url":"/images/fountain-pen.jpg","alt":"Fountain pen"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000002';
  insert into product_variants (id, product_id, sku, name, options, price_minor)
  values (vid,pid,'WS-FP-BLK','Black / Fine','{"color":"Black","nib":"Fine"}',345000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,40) on conflict do nothing;

  -- 3. Dotted notebook (all)
  pid := '33333333-0000-0000-0000-000000000003';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images, specs, price_tiers)
  values (pid,'11111111-0000-0000-0000-000000000002','A5 Dotted Notebook','a5-dotted-notebook',
    '160gsm bleed-proof dotted pages, lay-flat binding, elastic closure. Ideal for bullet journaling.',
    'PaperCo','all','published','[{"url":"/images/dotted-notebook.jpg","alt":"A5 dotted notebook"}]','{"gsm":160,"paper_size":"A5","ruling":"Dotted","sheet_count":160}','[{"min_qty":5,"discount_bps":500},{"min_qty":10,"discount_bps":1000}]')
  on conflict (slug) do nothing;
  insert into product_variants (id, product_id, sku, name, options, price_minor) values
    ('44444444-0000-0000-0000-000000000013',pid,'WS-NB-A5-TEAL','A5 / Teal','{"size":"A5","color":"Teal"}',150000),
    ('44444444-0000-0000-0000-000000000023',pid,'WS-NB-A5-BLK','A5 / Black','{"size":"A5","color":"Black"}',150000)
  on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values
    ('44444444-0000-0000-0000-000000000013',75),
    ('44444444-0000-0000-0000-000000000023',3)   -- low stock demo
  on conflict do nothing;

  -- 4. Watercolour set (art)
  pid := '33333333-0000-0000-0000-000000000004';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000003','Watercolour Paint Set (24)','watercolour-set-24',
    '24 half-pans of vibrant, blendable watercolour with a travel brush. Non-toxic.',
    'ArtLab','all','published','[{"url":"/images/watercolour.jpg","alt":"Watercolour set"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000004';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-WC-24','24 half-pans',275000,320000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,60) on conflict do nothing;

  -- 5. Crayons (kids)
  pid := '33333333-0000-0000-0000-000000000005';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000004','Jumbo Crayons (24)','jumbo-crayons-24',
    'Chunky, easy-grip crayons for little hands. Washable and non-toxic.',
    'DooWrite','kids','published','[{"url":"/images/crayons.jpg","alt":"Jumbo crayons"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000005';
  insert into product_variants (id, product_id, sku, name, price_minor)
  values (vid,pid,'WS-CRAY-24','24-pack',62000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,200) on conflict do nothing;

  -- 6. Desk organizer (office)
  pid := '33333333-0000-0000-0000-000000000006';
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images)
  values (pid,'11111111-0000-0000-0000-000000000005','Bamboo Desk Organizer','bamboo-desk-organizer',
    'Minimalist bamboo caddy with slots for pens, phone, notes and clips. Sustainably sourced.',
    'DeskLife','adults','published','[{"url":"/images/organizer.jpg","alt":"Bamboo desk organizer"}]')
  on conflict (slug) do nothing;
  vid := '44444444-0000-0000-0000-000000000006';
  insert into product_variants (id, product_id, sku, name, price_minor, compare_at_minor)
  values (vid,pid,'WS-ORG-BMB','Natural bamboo',420000,520000) on conflict (sku) do nothing;
  insert into inventory (variant_id, on_hand) values (vid,35) on conflict do nothing;
end $$;

-- ---------- collection membership ----------
insert into product_collections (product_id, collection_id) values
  ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000003'),
  ('33333333-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000003')
on conflict do nothing;

-- ---------- promotions ----------
insert into promotions (name, type, value, code, min_subtotal_minor, stackable, priority, is_active, starts_at, ends_at) values
  ('Welcome 10%','percentage',10,'WELCOME10',0,false,10,true,now(),now()+interval '90 days'),
  ('Deal of the Day -15%','percentage',15,null,0,false,20,true,now(),now()+interval '1 day'),
  ('Free shipping over LKR 5,000','free_shipping',0,null,500000,true,5,true,now(),now()+interval '365 days')
on conflict (code) do nothing;

-- ---------- banners ----------
insert into banners (title, image_url, link_url, placement, position, is_active, starts_at, ends_at) values
  ('Back to School — up to 30% off','/images/banner-bts.jpg','/c/kids-corner','home_hero',1,true,now(),now()+interval '60 days'),
  ('New journals just landed','/images/banner-journals.jpg','/products/a5-dotted-notebook','home_hero',2,true,now(),now()+interval '60 days'),
  ('Free delivery over LKR 5,000',null,'/promotions','promo_strip',1,true,now(),now()+interval '365 days')
on conflict do nothing;

-- ========== 0006_wishlist ==========
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

-- ========== 0008_bundles ==========
-- Bundles & school packs (curated / grade packs). Tables + RLS + seed; products
-- referenced below are created and seeded earlier in this file.
create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  age_group age_group not null default 'all',
  grade_label text,
  image_url text,
  bundle_price_minor int check (bundle_price_minor >= 0),
  is_featured boolean not null default false,
  position int not null default 0,
  status product_status not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists idx_bundles_status on bundles(status);

create table if not exists bundle_items (
  bundle_id uuid references bundles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  position int not null default 0,
  primary key (bundle_id, product_id)
);
create index if not exists idx_bundle_items_bundle on bundle_items(bundle_id);

alter table bundles      enable row level security;
alter table bundle_items enable row level security;

create policy pub_read_bundles on bundles for select
  using (status = 'published' or is_admin());
create policy pub_read_bundle_items on bundle_items for select using (true);
create policy admin_write_bundles on bundles for all
  using (has_perm('products:write')) with check (has_perm('products:write'));
create policy admin_write_bundle_items on bundle_items for all
  using (has_perm('products:write')) with check (has_perm('products:write'));

insert into bundles (id, name, slug, description, age_group, grade_label, bundle_price_minor, is_featured, position) values
  ('55555555-0000-0000-0000-000000000001','Grade 1–3 Starter Pack','grade-1-3-starter-pack','Everything a young learner needs for the new term — chunky crayons, smooth gel pens and ruled notebooks, picked for small hands.','kids','Grade 1–3',459000,true,1),
  ('55555555-0000-0000-0000-000000000002','Office Essentials Pack','office-essentials-pack','A desk-ready set for grown-ups — a classic fountain pen, a bamboo organizer and a dotted notebook for notes and planning.','adults','Office starter',829000,true,2),
  ('55555555-0000-0000-0000-000000000003','Little Artist Pack','little-artist-pack','Spark creativity with a vibrant watercolour set, jumbo crayons and glitter gel pens — a complete art kit in one.','kids','Ages 4+',null,false,3)
on conflict (slug) do nothing;

insert into bundle_items (bundle_id, product_id, variant_id, quantity, position) values
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000005',2,0),
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',1,1),
  ('55555555-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000013',2,2),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002',1,0),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000006','44444444-0000-0000-0000-000000000006',1,1),
  ('55555555-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000013',1,2),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000004',1,0),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000005',1,1),
  ('55555555-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',1,2)
on conflict do nothing;

-- ========== 0011_addresses ==========
-- Saved delivery address book, per signed-in customer. Single-default is kept by
-- the server action (unset others on save). No seed rows: addresses reference
-- auth-backed customers, which this file does not create.
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

-- ========== 0015_order_tracking ==========
-- Guest order tracking — TASK-NEXT-003 (courier + tracking link shown on /track)
alter table orders add column if not exists courier text
  check (courier is null or courier in ('domex', 'pronto', 'koombiyo', 'slpost', 'other'));
alter table orders add column if not exists tracking_url text
  check (tracking_url is null or tracking_url ~* '^https?://');

-- ========== 0016_stock_alerts ==========
-- Back-in-stock alerts — TASK-NEXT-005
-- Shopper leaves an email on an out-of-stock variant; when stock is added back
-- (admin adjust / CSV import) one email goes out and notified_at is set.
-- Rules: src/lib/stock-alerts/. Writes are server-side only (service role).
create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_id uuid references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
-- One pending alert per email + variant (re-subscribing after a notification is allowed).
create unique index if not exists uq_stock_alerts_pending
  on stock_alerts(variant_id, lower(email)) where notified_at is null;
create index if not exists idx_stock_alerts_variant on stock_alerts(variant_id) where notified_at is null;

alter table stock_alerts enable row level security;
drop policy if exists stock_alerts_admin_read on stock_alerts;
create policy stock_alerts_admin_read on stock_alerts for select using (is_admin());

-- ========== 0017_abandoned_cart ==========
-- Abandoned-cart email — TASK-NEXT-006
-- A cron (/api/cron/abandoned-carts) emails signed-in customers whose cart has
-- been idle > 24h, once per idle period. Rules: src/lib/cart/abandoned.ts.
alter table carts add column if not exists reminder_sent_at timestamptz;
alter table customers add column if not exists cart_reminders_opt_out boolean not null default false;

-- Any change to a cart's items counts as activity: bump carts.updated_at and
-- re-arm the reminder for the next idle period.
create or replace function touch_cart_on_item_change() returns trigger as $$
begin
  update carts set updated_at = now(), reminder_sent_at = null
   where id = coalesce(new.cart_id, old.cart_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists t_cart_items_touch on cart_items;
create trigger t_cart_items_touch after insert or update or delete on cart_items
  for each row execute function touch_cart_on_item_change();

create index if not exists idx_carts_reminder on carts(updated_at)
  where customer_id is not null and reminder_sent_at is null;

-- ========== 0018_gift_wrap ==========
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

-- ========== make yourself an admin ==========
-- AFTER you register an account in the app, run this (replace the email):
-- insert into admin_users (id, role)
--   select id, 'admin' from customers where email = 'you@example.com'
--   on conflict (id) do update set role = 'admin';

-- ========== 0019_loyalty ==========
-- Loyalty points — TASK-NEXT-008a
-- Earn 1 pt per LKR 100 of merchandise (after discounts) on delivered orders;
-- 1 pt = LKR 1 off at checkout, capped at a % of subtotal; points expire
-- 12 months after they were earned (FIFO). All rates admin-editable.
-- Rules: src/lib/loyalty/rules.ts. Ledger writes are server-side only (service role).
alter table store_settings add column if not exists loyalty_enabled boolean not null default false;
alter table store_settings add column if not exists loyalty_earn_per_minor int not null default 10000
  check (loyalty_earn_per_minor > 0);
alter table store_settings add column if not exists loyalty_point_value_minor int not null default 100
  check (loyalty_point_value_minor > 0);
alter table store_settings add column if not exists loyalty_max_redeem_pct int not null default 50
  check (loyalty_max_redeem_pct between 0 and 100);
alter table store_settings add column if not exists loyalty_expiry_months int not null default 12
  check (loyalty_expiry_months between 0 and 120); -- 0 = never expire

-- Append-only ledger. Balance = unexpired credits minus debits, consumed FIFO.
create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  kind text not null check (kind in ('earn', 'redeem', 'adjust', 'reverse')),
  points int not null check (points <> 0),
  expires_at timestamptz,
  note text check (note is null or char_length(note) <= 200),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_loyalty_customer on loyalty_ledger(customer_id, created_at);
-- One earn entry per order.
create unique index if not exists uq_loyalty_earn_order on loyalty_ledger(order_id) where kind = 'earn';

alter table orders add column if not exists loyalty_points_redeemed int not null default 0
  check (loyalty_points_redeemed >= 0);
-- Discount snapshotted at checkout (already deducted from total_minor).
alter table orders add column if not exists loyalty_discount_minor int not null default 0
  check (loyalty_discount_minor >= 0);

alter table loyalty_ledger enable row level security;
drop policy if exists loyalty_self_read on loyalty_ledger;
create policy loyalty_self_read on loyalty_ledger for select using (customer_id = auth.uid() or is_admin());

-- ========== 0020_quotes ==========
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

-- ========== 0021_loyalty_restore ==========
-- Loyalty points — TASK-NEXT-008c
-- Points redeemed at checkout are debited when the order is created. If the order
-- is later cancelled (gateway failure, failed payment webhook, expired stock hold,
-- admin cancel) this trigger credits them back once. Rules: src/lib/loyalty/.
create or replace function loyalty_restore_on_cancel() returns trigger as $$
declare
  months int;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and new.customer_id is not null and new.loyalty_points_redeemed > 0
     and not exists (select 1 from loyalty_ledger where order_id = new.id and kind = 'adjust' and note = 'restore:cancelled') then
    select loyalty_expiry_months into months from store_settings where id = 1;
    insert into loyalty_ledger (customer_id, order_id, kind, points, expires_at, note)
    values (new.customer_id, new.id, 'adjust', new.loyalty_points_redeemed,
            case when coalesce(months, 12) = 0 then null else now() + make_interval(months => coalesce(months, 12)) end,
            'restore:cancelled');
    insert into audit_logs (action, entity, entity_id, after)
    values ('loyalty.restore', 'orders', new.id, jsonb_build_object('points', new.loyalty_points_redeemed, 'customer_id', new.customer_id));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_loyalty_restore on orders;
create trigger trg_loyalty_restore after update of status on orders
  for each row execute function loyalty_restore_on_cancel();

-- ========== 0022_quote_access ==========
-- B2B quotes — TASK-NEXT-009c
-- Unguessable link token so a (possibly guest) buyer can view their priced quote
-- at /quote/view/<token> without signing in; sent_at records the last send.
alter table quotes add column if not exists access_token text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
create unique index if not exists uq_quotes_access_token on quotes(access_token);
alter table quotes add column if not exists sent_at timestamptz;

-- ========== 0023_quote_orders ==========
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
