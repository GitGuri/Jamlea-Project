-- Notification storage for both customers and internal team (admin/sales_rep).
-- Run this once in the Supabase SQL Editor, after 001_auth_user_sync.sql.

create type public.notification_type as enum (
  'quote_submitted',
  'quote_converted',
  'order_status_changed',
  'general'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null default 'general',
  title varchar(200) not null,
  message text not null,
  related_type varchar(50),
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_user_unread_idx on public.notifications(user_id) where is_read = false;
