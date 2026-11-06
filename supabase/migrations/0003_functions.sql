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
