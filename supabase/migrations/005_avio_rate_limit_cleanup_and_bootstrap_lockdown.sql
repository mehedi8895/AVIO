-- AVIO follow-up: keep minute/hour rate-limit windows separate during cleanup.
create or replace function public.avio_check_order_rate_limit(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  minute_count integer;
  hour_count integer;
  minute_bucket bigint := floor(extract(epoch from clock_timestamp()) / 60)::bigint;
  hour_bucket bigint := floor(extract(epoch from clock_timestamp()) / 3600)::bigint;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.avio_order_rate_limits(ip_hash, window_kind, window_bucket, request_count)
  values (p_ip_hash, 'minute', minute_bucket, 1)
  on conflict (ip_hash, window_kind, window_bucket)
  do update set request_count = public.avio_order_rate_limits.request_count + 1
  returning request_count into minute_count;
  insert into public.avio_order_rate_limits(ip_hash, window_kind, window_bucket, request_count)
  values (p_ip_hash, 'hour', hour_bucket, 1)
  on conflict (ip_hash, window_kind, window_bucket)
  do update set request_count = public.avio_order_rate_limits.request_count + 1
  returning request_count into hour_count;
  delete from public.avio_order_rate_limits
  where (window_kind = 'minute' and window_bucket < minute_bucket - 120)
     or (window_kind = 'hour' and window_bucket < hour_bucket - 48);
  return minute_count <= 5 and hour_count <= 20;
end;
$$;
revoke all on function public.avio_check_order_rate_limit(text) from public, anon, authenticated;
grant execute on function public.avio_check_order_rate_limit(text) to service_role;

-- AVIO's first owner has already been initialized; close one-time bootstrap.
revoke all on function public.avio_bootstrap_admin() from public, anon, authenticated;
grant execute on function public.avio_bootstrap_admin() to service_role;
