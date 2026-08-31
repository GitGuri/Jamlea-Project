-- Adds a second, automated checkout path (PayFast) alongside the existing
-- manual approve-then-bank-transfer flow, plus an admin exception queue for
-- whatever can't be fully automated. Additive only -- nothing here changes
-- the meaning or behavior of the existing pending_approval/approved/
-- processing/completed states, approve_order/cancel_order, or the existing
-- payments review flow.
--
-- MUST run after 013_payfast_order_status_values.sql has been executed AND
-- COMMITTED as its own separate SQL Editor run -- this file's functions
-- reference the enum values that migration adds, and Postgres refuses to
-- use a newly-added enum value in the same transaction that added it.

-- payments already exists (bank-transfer, admin-reviewed -- 006_payments.sql).
-- Rather than a second table of the same name for gateway transactions, it
-- gets extended: existing rows are implicitly gateway='manual'; PayFast rows
-- get gateway='payfast' with these columns populated by the verified webhook.
alter table public.payments
  add column gateway varchar(20) not null default 'manual',
  add column gateway_reference varchar(100),
  add column gateway_status varchar(30),
  add column verified_at timestamptz,
  add column proof_url text;

create unique index payments_gateway_reference_key on public.payments(gateway_reference)
  where gateway_reference is not null;

-- Public bucket for manual-payment proof-of-payment uploads, same "public,
-- backend writes via the service-role key" shape as the existing Product
-- Images bucket (created via the Supabase dashboard, not tracked in a
-- migration -- this one's created here instead so it's reproducible).
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index stock_reservations_order_id_idx on public.stock_reservations(order_id);
create index stock_reservations_expires_at_idx on public.stock_reservations(expires_at);

create type public.admin_review_reason as enum ('stock_short', 'manual_payment', 'high_value', 'new_customer');
create type public.admin_review_status as enum ('pending', 'resolved');

create table public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reason public.admin_review_reason not null,
  status public.admin_review_status not null default 'pending',
  assigned_to uuid references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index admin_reviews_status_idx on public.admin_reviews(status);
create index admin_reviews_order_id_idx on public.admin_reviews(order_id);

-- The fast-checkout path's equivalent of approve_order/cancel_order in
-- 003_order_stock_management.sql -- same plpgsql/security definer/for
-- update shape, since that's the established way in this codebase to get
-- real transactional row-locking (PostgREST/supabase-js can't span a
-- multi-statement transaction on its own).
--
-- Locks every product row involved in the quote, then either:
--   - every line has enough stock: creates the order straight into
--     'stock_reserved', decrements stock, records the reservation, and
--     marks the quote converted; or
--   - any line is short: creates the order into the *existing*
--     'pending_approval' state instead (no stock touched) so it falls into
--     the same admin queue/UI that already handles manual-approval orders
--     today -- the caller is responsible for logging the admin_reviews row
--     (reason='stock_short'), this function only reports which line was short.
--
-- v_quote_status is declared text rather than a specific enum type since
-- quotes.status's exact Postgres type wasn't created by any tracked
-- migration (predates this migration series) -- text is safe either way via
-- implicit cast.
create or replace function public.checkout_quote_with_reservation(
  p_quote_id uuid,
  p_customer_id uuid,
  p_reservation_minutes integer default 60
)
returns table (
  order_id uuid,
  order_status public.order_status,
  short_product_id uuid,
  short_requested integer,
  short_available integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_status text;
  v_total_amount numeric;
  v_order_id uuid;
  v_short_product_id uuid;
  v_short_requested integer;
  v_short_available integer;
begin
  select status, total_amount into v_quote_status, v_total_amount
  from public.quotes
  where id = p_quote_id and customer_id = p_customer_id
  for update;

  if v_quote_status is null then
    raise exception 'Quote % not found for this customer', p_quote_id;
  end if;
  if v_quote_status <> 'submitted' then
    raise exception 'Quote is not submitted (status: %)', v_quote_status;
  end if;

  perform 1 from public.products p
    join public.quote_items qi on qi.product_id = p.id
    where qi.quote_id = p_quote_id
    for update of p;

  select qi.product_id, qi.quantity, p.stock_quantity
    into v_short_product_id, v_short_requested, v_short_available
    from public.quote_items qi
    join public.products p on p.id = qi.product_id
    where qi.quote_id = p_quote_id and p.stock_quantity < qi.quantity
    limit 1;

  if v_short_product_id is null then
    insert into public.orders (quote_id, customer_id, total_amount, status, source)
    values (p_quote_id, p_customer_id, v_total_amount, 'stock_reserved', 'portal')
    returning id into v_order_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    select v_order_id, qi.product_id, qi.quantity, qi.unit_price
    from public.quote_items qi where qi.quote_id = p_quote_id;

    update public.products p
    set stock_quantity = p.stock_quantity - qi.quantity
    from public.quote_items qi
    where qi.quote_id = p_quote_id and qi.product_id = p.id;

    insert into public.stock_reservations (order_id, product_id, quantity, expires_at)
    select v_order_id, qi.product_id, qi.quantity, now() + (p_reservation_minutes || ' minutes')::interval
    from public.quote_items qi where qi.quote_id = p_quote_id;

    update public.quotes set status = 'converted' where id = p_quote_id;

    return query select v_order_id, 'stock_reserved'::public.order_status, null::uuid, null::integer, null::integer;
  else
    insert into public.orders (quote_id, customer_id, total_amount, status, source)
    values (p_quote_id, p_customer_id, v_total_amount, 'pending_approval', 'portal')
    returning id into v_order_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    select v_order_id, qi.product_id, qi.quantity, qi.unit_price
    from public.quote_items qi where qi.quote_id = p_quote_id;

    update public.quotes set status = 'converted' where id = p_quote_id;

    return query select v_order_id, 'pending_approval'::public.order_status, v_short_product_id, v_short_requested, v_short_available;
  end if;
end;
$$;

-- Set-based sweep for the scheduled expiry job
-- (backend/src/jobs/releaseExpiredReservations.js): restores stock for every
-- reservation past expires_at whose order is still 'stock_reserved' (i.e.
-- never got a confirmed payment), deletes those reservations, and cancels
-- the orders. Returns the affected order ids so the Node caller can send
-- customer notifications, which plpgsql can't do itself.
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

    delete from public.stock_reservations where order_id = v_order_id;

    update public.orders set status = 'cancelled', updated_at = now() where id = v_order_id;

    v_released := array_append(v_released, v_order_id);
  end loop;

  return query select unnest(v_released);
end;
$$;

-- Re-defines the existing cancel_order (003_order_stock_management.sql) with
-- one addition: also clean up any stock_reservations row for the order.
-- Needed now that an order can reach 'cancelled' from 'stock_reserved' too
-- (an admin manually cancelling one via the generic status endpoint, rather
-- than letting release_expired_reservations() handle it) -- restocking via
-- order_items already worked correctly for that case (same mechanism as
-- pending_approval -> cancelled), this just stops the reservation row from
-- being left behind pointing at a cancelled order.
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

  delete from public.stock_reservations where order_id = p_order_id;

  update public.orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end;
$$;
