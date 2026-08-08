-- Defense-in-depth: the Express backend talks to Supabase with the service-role
-- key, which bypasses RLS entirely, so none of this affects the API. It only
-- matters if the anon/authenticated key is ever used directly (e.g. future
-- direct-from-frontend Supabase Auth calls). All writes still only happen
-- through the backend. Run after 003_order_stock_management.sql.

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

create policy users_select_own on public.users
  for select using (id = auth.uid());

create policy products_select_all on public.products
  for select using (auth.role() = 'authenticated');

create policy quotes_select_own on public.quotes
  for select using (customer_id = auth.uid());

create policy quote_items_select_own on public.quote_items
  for select using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.customer_id = auth.uid())
  );

create policy orders_select_own on public.orders
  for select using (customer_id = auth.uid());

create policy order_items_select_own on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
