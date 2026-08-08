-- Links public.users to Supabase Auth (auth.users) and keeps them in sync.
-- Run this once in the Supabase SQL Editor.

-- public.users.id must equal the auth.users.id it belongs to, not an
-- independently generated uuid.
alter table public.users alter column id drop default;

alter table public.users
  add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- Auto-create the profile row whenever someone signs up via Supabase Auth.
-- company_name/role are read from the metadata passed to supabase.auth.admin.createUser().
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, company_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'company_name',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
