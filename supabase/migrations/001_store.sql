create extension if not exists pgcrypto;
create table if not exists public.avio_products (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, description text not null default '', price_bdt integer not null check(price_bdt>0), unit text not null default 'service', label text not null default 'AVIO SERVICE', active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.avio_orders (
 id uuid primary key default gen_random_uuid(), order_number text unique not null default ('AV-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10))), customer_name text not null, customer_phone text not null, business_details text not null default '', items jsonb not null, total_bdt integer not null check(total_bdt>0), payment_method text not null check(payment_method in ('bkash','nagad','rocket')), account_type text not null check(account_type in ('personal','agent')), sender_phone text not null, transaction_id text, payment_status text not null default 'pending' check(payment_status in ('pending','verified','rejected')), order_status text not null default 'pending' check(order_status in ('pending','confirmed','in_progress','completed','cancelled')), admin_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.avio_admin_profiles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'owner' check(role in ('owner','admin')), created_at timestamptz not null default now());
create or replace function public.avio_is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.avio_admin_profiles where user_id=auth.uid()); $$;
revoke all on function public.avio_is_admin() from public,anon; grant execute on function public.avio_is_admin() to authenticated;
create or replace function public.avio_bootstrap_admin() returns jsonb language plpgsql security definer set search_path=public,auth as $$ begin if auth.uid() is null then raise exception 'Sign in first'; end if; perform pg_advisory_xact_lock(740118220); if exists(select 1 from public.avio_admin_profiles) then raise exception 'AVIO admin has already been initialized'; end if; insert into public.avio_admin_profiles(user_id,role) values(auth.uid(),'owner'); return jsonb_build_object('success',true); end; $$;
revoke all on function public.avio_bootstrap_admin() from public,anon; grant execute on function public.avio_bootstrap_admin() to authenticated;
create or replace function public.avio_submit_order(p_customer_name text,p_customer_phone text,p_sender_phone text,p_transaction_id text,p_business_details text,p_payment_method text,p_account_type text,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; product public.avio_products%rowtype; qty integer; total integer:=0; lines jsonb:='[]'::jsonb; orderrow public.avio_orders%rowtype;
begin
 if length(trim(coalesce(p_customer_name,'')))<2 or length(trim(coalesce(p_customer_phone,'')))<6 or length(trim(coalesce(p_sender_phone,'')))<6 then raise exception 'Invalid customer details'; end if;
 if p_payment_method not in ('bkash','nagad','rocket') or p_account_type not in ('personal','agent') then raise exception 'Invalid payment method'; end if;
 if p_account_type='personal' and length(trim(coalesce(p_transaction_id,'')))<3 then raise exception 'Transaction ID required'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'Invalid items'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  qty:=greatest(1,least(50,coalesce((item->>'quantity')::integer,1)));
  select * into product from public.avio_products where id=(item->>'product_id')::uuid and active=true;
  if not found then raise exception 'Product unavailable'; end if;
  total:=total+product.price_bdt*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'unit_price_bdt',product.price_bdt,'quantity',qty));
 end loop;
 insert into public.avio_orders(customer_name,customer_phone,business_details,items,total_bdt,payment_method,account_type,sender_phone,transaction_id)
 values(left(trim(p_customer_name),120),left(trim(p_customer_phone),40),left(coalesce(p_business_details,''),2000),lines,total,p_payment_method,p_account_type,left(trim(p_sender_phone),40),case when p_account_type='personal' then left(trim(p_transaction_id),100) else null end)
 returning * into orderrow;
 return jsonb_build_object('id',orderrow.id,'order_number',orderrow.order_number,'total_bdt',orderrow.total_bdt);
end; $$;
revoke all on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) from public; grant execute on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) to anon,authenticated;
alter table public.avio_products enable row level security; alter table public.avio_orders enable row level security; alter table public.avio_admin_profiles enable row level security;
drop policy if exists avio_products_public_read on public.avio_products; create policy avio_products_public_read on public.avio_products for select to anon,authenticated using(active=true);
drop policy if exists avio_products_admin_read on public.avio_products; create policy avio_products_admin_read on public.avio_products for select to authenticated using(public.avio_is_admin());
drop policy if exists avio_products_admin_write on public.avio_products; create policy avio_products_admin_write on public.avio_products for all to authenticated using(public.avio_is_admin()) with check(public.avio_is_admin());
drop policy if exists avio_orders_admin_read on public.avio_orders; create policy avio_orders_admin_read on public.avio_orders for select to authenticated using(public.avio_is_admin());
drop policy if exists avio_orders_admin_update on public.avio_orders; create policy avio_orders_admin_update on public.avio_orders for update to authenticated using(public.avio_is_admin()) with check(public.avio_is_admin());
drop policy if exists avio_admin_profile_read_self on public.avio_admin_profiles; create policy avio_admin_profile_read_self on public.avio_admin_profiles for select to authenticated using(user_id=auth.uid());
insert into public.avio_products(name,slug,description,price_bdt,unit,label,sort_order) values
('2 Motion Graphics Videos','avio-two-motion-graphics-videos','Two promotional motion graphics videos for your business.',500,'package','POPULAR',1),
('Motion Graphics Video + Voice','avio-motion-graphics-with-voice','Promotional motion graphics video with voice-over.',700,'video','WITH VOICE',2),
('Video + Campaign Setup & Publishing','avio-video-campaign-setup','Motion graphics video with Meta campaign setup and publishing.',1000,'campaign','LAUNCH READY',3),
('1 Month Organic Social Media Marketing','avio-one-month-organic-marketing','One month of organic social media marketing.',7970,'month','MONTHLY',4)
on conflict(slug) do nothing;
