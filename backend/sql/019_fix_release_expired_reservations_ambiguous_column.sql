-- Fixes a real bug caught by actually invoking release_expired_reservations()
-- (014_payfast_checkout_and_review_queue.sql) against live data for the
-- first time: Postgres error "column reference \"order_id\" is ambiguous".
--
-- The function is declared `returns table (order_id uuid)`, which implicitly
-- creates an `order_id` identifier in the function's own PL/pgSQL namespace
-- (alongside the OUT-parameter-like return column) -- so the bare
-- `where order_id = v_order_id` inside the DELETE was ambiguous between
-- that and stock_reservations.order_id, and the function has been failing
-- (and rolling back, atomically, so no data was corrupted -- just never
-- released) on every single order that ever actually had an expired
-- reservation. This has been silently broken since 014 was written.
--
-- Fix: qualify the column with the table name, same as every other
-- reference to stock_reservations.order_id in this function already is.
create or replace function public.release_expired_reservations()
returns table (order_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_released uuid[] := '{}';
begin
  for v_order_id in
    select distinct sr.order_id
    from public.stock_reservations sr
    join public.orders o on o.id = sr.order_id
    where sr.expires_at < now() and o.status = 'stock_reserved'
  loop
    perform 1 from public.orders where id = v_order_id for update;

    update public.products p
    set stock_quantity = p.stock_quantity + sr.quantity
    from public.stock_reservations sr
    where sr.order_id = v_order_id and sr.product_id = p.id;

    delete from public.stock_reservations where stock_reservations.order_id = v_order_id;

    update public.orders set status = 'cancelled', updated_at = now() where id = v_order_id;

    v_released := array_append(v_released, v_order_id);
  end loop;

  return query select unnest(v_released);
end;
$$;
