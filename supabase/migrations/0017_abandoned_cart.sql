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
