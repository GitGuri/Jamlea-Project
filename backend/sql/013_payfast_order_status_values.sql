-- Split into its own migration and MUST be run (and committed) separately
-- from 014_payfast_checkout_and_review_queue.sql, which references these
-- new values inside stored function bodies. Postgres refuses to use a
-- newly-added enum value in the same transaction that added it ("unsafe use
-- of new value of enum type") -- running these as two separate SQL Editor
-- executions guarantees this one has fully committed before 014 runs, no
-- ambiguity about how any given transaction gets batched.
--
-- 'stock_reserved' is system-driven only (set by
-- checkout_quote_with_reservation in 014, never picked from the admin
-- status dropdown); 'confirmed'/'ready_for_collection' are the fast-checkout
-- path's equivalent of the existing approved->processing->completed tail,
-- kept as separate vocabulary rather than reusing those three so the two
-- paths don't get their meanings blurred together.
-- Run this once in the Supabase SQL Editor, after 012_admin_source.sql --
-- then run 014_payfast_checkout_and_review_queue.sql as a SEPARATE execution.

alter type public.order_status add value 'stock_reserved';
alter type public.order_status add value 'confirmed';
alter type public.order_status add value 'ready_for_collection';
