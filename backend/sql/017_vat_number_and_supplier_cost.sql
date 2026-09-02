-- Two additive fields needed to eventually support real invoicing/VAT:
--   1. Customers' VAT number, collected at self-registration (optional --
--      not every business is VAT-registered, and existing accounts predate
--      this field so they'll be blank until a customer fills theirs in).
--   2. Products' supplier cost, alongside the existing supplier_name/
--      location/email/phone (011_product_supplier_details.sql) -- what we
--      pay the supplier, distinct from unit_price (what the customer pays
--      us), needed for margin visibility once invoicing exists. Nullable
--      for the same reason the other supplier_* columns are: no fake
--      placeholder values for products that don't have it recorded yet.
-- Run this once in the Supabase SQL Editor, after 016_fix_payments_gateway_reference_upsert.sql.

alter table public.users add column vat_number varchar(30);

alter table public.products add column supplier_cost numeric;
