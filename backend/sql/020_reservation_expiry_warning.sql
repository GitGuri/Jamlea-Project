-- Adds a "your reservation is about to expire" warning, run on its own
-- schedule shortly before release_expired_reservations() (019/014) would
-- otherwise cancel the order silently. Without this, a customer who reserved
-- stock via checkout_quote_with_reservation only ever finds out their window
-- lapsed *after* the fact, via the "reservation expired" notification the
-- release job already sends -- by then the sale is already lost.

-- One flag per order (not per stock_reservations row) since a single
-- fast-checkout order can have several reservation rows -- one per line
-- item -- all sharing the same expires_at, and the warning should fire once
-- per order, not once per line.
alter table public.orders add column reservation_warned_at timestamptz;

-- Atomically claims (marks warned) every stock_reserved order whose
-- reservation expires within the next p_lead_minutes and hasn't been warned
-- yet, returning their ids so the Node caller (warnExpiringReservations.js)
-- can send the actual notifications -- plpgsql can't send emails/WhatsApp
-- messages itself, same division of labor as release_expired_reservations().
--
-- The UPDATE...FROM...RETURNING shape is what makes this safe to run on a
-- schedule without double-warning: marking reservation_warned_at in the same
-- statement that selects the due rows means two overlapping runs of this job
-- can't both pick up the same order, the same way orderConversion.js's
-- whatsapp state claim avoids a double-tap race.
create or replace function public.warn_expiring_reservations(p_lead_minutes integer default 10)
returns table (order_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.orders o
  set reservation_warned_at = now()
  from (
    select distinct sr.order_id
    from public.stock_reservations sr
    join public.orders oo on oo.id = sr.order_id
    where oo.status = 'stock_reserved'
      and oo.reservation_warned_at is null
      and sr.expires_at > now()
      and sr.expires_at <= now() + (p_lead_minutes || ' minutes')::interval
  ) due
  where o.id = due.order_id
  returning o.id;
end;
$$;
