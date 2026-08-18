-- WhatsApp ordering/quotation flow. Identity is the customer's phone number:
-- a WhatsApp message from a number matching users.phone is automatically
-- that account. quotes/orders gain a source tag (portal vs whatsapp) so the
-- existing admin pages can show/filter by channel without a separate UI.
-- Run this once in the Supabase SQL Editor, after 007_staff_account_approval.sql.

create type public.request_source as enum ('portal', 'whatsapp');

alter table public.users add column phone varchar(20) unique;
alter table public.quotes add column source public.request_source not null default 'portal';
alter table public.orders add column source public.request_source not null default 'portal';

-- Per-phone-number conversation state. WhatsApp's webhook is stateless per
-- message, so this is what makes a multi-step chat (browse -> pick quantity
-- -> review -> confirm) possible at all.
create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) not null unique,
  user_id uuid references public.users(id) on delete set null,
  state varchar(50) not null default 'main_menu',
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index whatsapp_conversations_phone_idx on public.whatsapp_conversations(phone);

-- Defense-in-depth, same caveat as 004_row_level_security.sql: the backend
-- talks to Supabase with the service-role key and bypasses this entirely.
-- No policies -- this table is never queried directly by the frontend.
alter table public.whatsapp_conversations enable row level security;
