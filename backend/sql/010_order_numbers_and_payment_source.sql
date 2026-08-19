-- Two additions needed to submit payments over WhatsApp:
--
-- 1. Human-friendly, sequential order reference numbers, same reasoning and
--    same shape as quote_number in 009_quote_numbers_and_message_dedup.sql:
--    orders were only ever identified by their UUID, which nobody can read
--    back over WhatsApp when picking which order to pay for.
--
-- 2. A `source` column on payments, mirroring quotes.source/orders.source,
--    so admin views can tell a WhatsApp payment submission apart from a
--    portal one.
--
-- Run this once in the Supabase SQL Editor, after 009_quote_numbers_and_message_dedup.sql.

alter table public.orders add column order_number bigint;

with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.orders
)
update public.orders o set order_number = numbered.rn
from numbered
where numbered.id = o.id;

alter table public.orders alter column order_number set not null;
alter table public.orders add constraint orders_order_number_key unique (order_number);

create sequence public.orders_order_number_seq owned by public.orders.order_number;
select setval('public.orders_order_number_seq', (select coalesce(max(order_number), 0) from public.orders));
alter table public.orders alter column order_number set default nextval('public.orders_order_number_seq');

alter table public.payments add column source varchar(20) not null default 'portal';
