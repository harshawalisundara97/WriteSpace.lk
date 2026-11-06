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
