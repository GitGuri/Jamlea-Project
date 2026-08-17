-- Bank-transfer / EFT payment submissions against approved orders. There's
-- no real payment gateway wired up, so this is a manual-review flow: the
-- customer submits what they paid and a reference number, staff cross-check
-- their bank statement and approve or reject.
-- Run this once in the Supabase SQL Editor, after 005_seed_products.sql.

create type public.payment_status as enum ('submitted', 'approved', 'rejected');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  method varchar(50) not null,
  reference varchar(100) not null,
  amount numeric not null check (amount > 0),
  note text,
  status public.payment_status not null default 'submitted',
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments(order_id);
create index payments_customer_id_idx on public.payments(customer_id);

-- Defense-in-depth, same caveat as 004_row_level_security.sql: the backend
-- talks to Supabase with the service-role key and bypasses this entirely.
alter table public.payments enable row level security;

create policy payments_select_own on public.payments
  for select using (customer_id = auth.uid());
