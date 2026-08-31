-- Admin-only audit trail of significant actions across the app: order
-- status changes, payment/admin-review decisions, quote-to-order
-- conversions, and staff/customer account changes. Deliberately separate
-- from `notifications` (002_notifications.sql) -- that's a per-user inbox
-- both admin and sales_rep already see; this is admin-only, since part of
-- its purpose is oversight of what sales_rep accounts are doing, which
-- they shouldn't be able to read themselves.

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  -- Nullable + a denormalized label snapshot, not just a join to users:
  -- some events are system-triggered (PayFast webhook, reservation-expiry
  -- job) with no user actor at all, and a human actor's account could
  -- later be deleted (users.id cascades from auth.users) without the log
  -- entry losing its meaning.
  actor_id uuid references public.users(id) on delete set null,
  actor_label text not null,
  action varchar(100) not null,
  entity_type varchar(50),
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log(created_at desc);
create index activity_log_entity_idx on public.activity_log(entity_type, entity_id);
