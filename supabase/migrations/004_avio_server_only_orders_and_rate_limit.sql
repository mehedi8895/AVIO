create table if not exists public.avio_order_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_kind text not null check (window_kind in ('minute', 'hour')),
  window_bucket bigint not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (ip_hash, window_kind, window_bucket)
);
alter table public.avio_order_rate_limits enable row level security;
revoke all on public.avio_order_rate_limits from anon, authenticated, public;
grant all on public.avio_order_rate_limits to service_role;

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
  delete from public.avio_order_rate_limits where window_bucket < hour_bucket - 2;
  return minute_count <= 5 and hour_count <= 20;
end;
$$;
revoke all on function public.avio_check_order_rate_limit(text) from public, anon, authenticated;
grant execute on function public.avio_check_order_rate_limit(text) to service_role;

revoke all on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) to service_role;
revoke all on function public.avio_is_admin() from public, anon;
grant execute on function public.avio_is_admin() to authenticated, service_role;
revoke all on function public.avio_bootstrap_admin() from public, anon;
grant execute on function public.avio_bootstrap_admin() to authenticated, service_role;
