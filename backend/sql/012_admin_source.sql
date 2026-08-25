-- Staff (admin/sales_rep) can now create quotes and convert quotes to
-- orders on behalf of a customer (see quoteController.js's
-- createQuoteForCustomerAdmin and the staff branch in convertQuoteToOrder).
-- Those get tagged source = 'admin', a third value alongside the existing
-- 'portal'/'whatsapp' -- but request_source is a Postgres enum
-- (008_whatsapp_integration.sql) that only allows those two today, so
-- inserting 'admin' fails at the database level until this runs.
-- Run this once in the Supabase SQL Editor, after 011_product_supplier_details.sql.

alter type public.request_source add value 'admin';
