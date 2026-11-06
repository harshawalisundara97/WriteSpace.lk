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
