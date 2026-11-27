-- Use invoker permissions for AVIO's admin predicate; RLS on the profile
-- table ensures users can only see their own admin row.
create or replace function public.avio_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, auth, public
as $$
  select exists (
    select 1 from public.avio_admin_profiles
    where user_id = auth.uid()
  );
$$;
revoke all on function public.avio_is_admin() from public, anon;
grant execute on function public.avio_is_admin() to authenticated, service_role;
