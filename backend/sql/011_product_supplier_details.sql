-- Supplier details on products, so admins can track who each item is
-- actually sourced from. Nullable -- the 50 already-seeded products have
-- no supplier data and shouldn't need fake placeholder values; they just
-- show blank until an admin edits that product. New products created via
-- the admin form require name/location/phone (email stays optional),
-- enforced at the API layer (createProductRules in productRoute.js), not
-- here.
-- Run this once in the Supabase SQL Editor, after 010_order_numbers_and_payment_source.sql.

alter table public.products
  add column supplier_name varchar(150),
  add column supplier_location varchar(150),
  add column supplier_email varchar(150),
  add column supplier_phone varchar(50);
