-- Self-service staff signup + admin approval. Staff (sales_rep) sign up
-- through the same public /register endpoint customers use, land as
-- 'pending', and can't log in until an admin approves them.
-- Run this once in the Supabase SQL Editor, after 006_payments.sql.

create type public.account_status as enum ('pending', 'approved', 'rejected');

-- `not null default 'approved'` backfills every existing row (including
-- already-working admin/sales_rep/customer accounts) to 'approved' as part
-- of this ALTER TABLE, so nobody currently able to log in loses access.
alter table public.users
  add column status public.account_status not null default 'approved',
  add column full_name varchar(255);
