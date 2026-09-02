-- Fixes a real bug caught testing a live PayFast sandbox payment: Postgres
-- error 42P10 ("there is no unique or exclusion constraint matching the ON
-- CONFLICT specification") on every PayFast ITN, because
-- payments_gateway_reference_key (014_payfast_checkout_and_review_queue.sql)
-- is a PARTIAL unique index (`where gateway_reference is not null`), and
-- Postgres refuses to use a partial index as an ON CONFLICT target unless
-- the exact same WHERE predicate is also given in the ON CONFLICT clause --
-- which supabase-js's simple `.upsert(..., { onConflict: 'gateway_reference' })`
-- has no way to express.
--
-- The partial predicate was never actually necessary: a plain (non-partial)
-- unique constraint already treats NULL as distinct from every other NULL,
-- so manual-payment rows (which never set gateway_reference) were never
-- going to spuriously conflict with each other either way.

drop index public.payments_gateway_reference_key;

alter table public.payments
  add constraint payments_gateway_reference_key unique (gateway_reference);
