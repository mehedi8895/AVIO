-- AVIO security hardening: prevent payment-reference replay and secure
-- SECURITY DEFINER function search paths. This migration was applied to the
-- connected project and is idempotent for future environments.
create unique index if not exists avio_orders_unique_payment_reference
on public.avio_orders (payment_method, lower(trim(transaction_id)))
where transaction_id is not null and trim(transaction_id) <> '';

alter function public.avio_is_admin() set search_path = pg_catalog, auth, public;
alter function public.avio_bootstrap_admin() set search_path = pg_catalog, auth, public;
alter function public.avio_submit_order(text, text, text, text, text, text, text, jsonb)
set search_path = pg_catalog, auth, public;
