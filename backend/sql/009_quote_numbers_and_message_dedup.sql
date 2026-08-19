-- Two fixes for the WhatsApp flow:
--
-- 1. Human-friendly, sequential quote reference numbers. Quotes were only
--    ever identified by their UUID (shown as an 8-character slice), which
--    nobody can remember or read back over WhatsApp when picking which
--    quote to convert to an order.
--
-- 2. A table to deduplicate incoming WhatsApp messages by their wamid.
--    Meta retries a webhook delivery if it doesn't get a fast enough 200
--    response (e.g. Render's free tier cold-starting), resending the exact
--    same message id -- without tracking which wamids have already been
--    processed, each retry re-runs the same action (e.g. "confirm this
--    quote") as if it were a brand new message.
--
-- Run this once in the Supabase SQL Editor, after 008_whatsapp_integration.sql.

alter table public.quotes add column quote_number bigint;

with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.quotes
)
update public.quotes q set quote_number = numbered.rn
from numbered
where numbered.id = q.id;

alter table public.quotes alter column quote_number set not null;
alter table public.quotes add constraint quotes_quote_number_key unique (quote_number);

create sequence public.quotes_quote_number_seq owned by public.quotes.quote_number;
select setval('public.quotes_quote_number_seq', (select coalesce(max(quote_number), 0) from public.quotes));
alter table public.quotes alter column quote_number set default nextval('public.quotes_quote_number_seq');

create table public.whatsapp_processed_messages (
  wamid varchar(100) primary key,
  created_at timestamptz not null default now()
);
