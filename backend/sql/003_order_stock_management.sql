-- Atomic stock decrement on order approval, and restock on cancellation.
-- Run this once in the Supabase SQL Editor, after 002_notifications.sql.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_stock_quantity_check'
  ) then
    alter table public.products
      add constraint products_stock_quantity_check check (stock_quantity >= 0);
  end if;
end $$;

create or replace function public.approve_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_item record;
begin
  select status into v_status from public.orders where id = p_order_id for update;

  if v_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_status <> 'pending_approval' then
    raise exception 'Order % is not pending approval (current status: %)', p_order_id, v_status;
  end if;

  for v_item in
    select oi.product_id, oi.quantity, p.stock_quantity, p.name
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
    for update of p
  loop
    if v_item.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for product % (have %, need %)',
        v_item.name, v_item.stock_quantity, v_item.quantity;
    end if;
  end loop;

  update public.products p
  set stock_quantity = p.stock_quantity - oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  update public.orders set status = 'approved', updated_at = now() where id = p_order_id;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  select status into v_status from public.orders where id = p_order_id for update;

  if v_status is null then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_status in ('completed', 'cancelled') then
    raise exception 'Order % cannot be cancelled from status %', p_order_id, v_status;
  end if;

  -- Only restock if stock had actually been decremented (i.e. past pending_approval).
  if v_status <> 'pending_approval' then
    update public.products p
    set stock_quantity = p.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;

  update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end;
$$;
