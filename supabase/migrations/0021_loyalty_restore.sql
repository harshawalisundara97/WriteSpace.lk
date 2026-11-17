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
