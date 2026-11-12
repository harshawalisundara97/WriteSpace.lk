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
create policy admin_read_audit on audit_logs for select using (is_admin());

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
  insert into products (id, category_id, name, slug, description, brand, age_group, status, images, specs)
  values (pid,'11111111-0000-0000-0000-000000000002','A5 Dotted Notebook','a5-dotted-notebook',
    '160gsm bleed-proof dotted pages, lay-flat binding, elastic closure. Ideal for bullet journaling.',
    'PaperCo','all','published','[{"url":"/images/dotted-notebook.jpg","alt":"A5 dotted notebook"}]','{"gsm":160,"paper_size":"A5","ruling":"Dotted","sheet_count":160}')
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

-- ========== make yourself an admin ==========
-- AFTER you register an account in the app, run this (replace the email):
-- insert into admin_users (id, role)
--   select id, 'admin' from customers where email = 'you@example.com'
--   on conflict (id) do update set role = 'admin';
