-- Customer address, needed on a professional-looking quotation PDF (along
-- with company_name/vat_number, already collected). Free-text/multi-line
-- rather than structured street/city/postal fields -- simpler to collect
-- and edit, and a single formatted text block reads better on a document
-- header than concatenated separate fields would anyway.
-- Run this once in the Supabase SQL Editor, after 017_vat_number_and_supplier_cost.sql.

alter table public.users add column address text;
