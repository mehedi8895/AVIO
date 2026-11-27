create extension if not exists pgcrypto;
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, description text not null default '', price_bdt integer not null check (price_bdt > 0), unit text not null default 'service', label text not null default 'AVIO SERVICE', active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), order_number text unique not null default ('AV-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))), customer_name text not null, customer_phone text not null, business_details text not null default '', items jsonb not null, total_bdt integer not null check(total_bdt > 0), payment_method text not null check(payment_method in ('bkash','nagad','rocket')), account_type text not null check(account_type in ('personal','agent')), sender_phone text not null, transaction_id text, payment_status text not null default 'pending' check(payment_status in ('pending','verified','rejected')), order_status text not null default 'pending' check(order_status in ('pending','confirmed','in_progress','completed','cancelled')), admin_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'admin' check(role in ('owner','admin')), created_at timestamptz not null default now()
);
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admin_profiles enable row level security;
create policy "Public can view active products" on public.products for select using (active = true);
create policy "Admins manage products" on public.products for all to authenticated using (exists(select 1 from public.admin_profiles a where a.user_id = auth.uid())) with check (exists(select 1 from public.admin_profiles a where a.user_id = auth.uid()));
create policy "Customers can submit orders" on public.orders for insert to anon, authenticated with check (true);
create policy "Admins view and manage orders" on public.orders for select to authenticated using (exists(select 1 from public.admin_profiles a where a.user_id = auth.uid()));
create policy "Admins update orders" on public.orders for update to authenticated using (exists(select 1 from public.admin_profiles a where a.user_id = auth.uid())) with check (exists(select 1 from public.admin_profiles a where a.user_id = auth.uid()));
create policy "Admins read own profile" on public.admin_profiles for select to authenticated using (user_id = auth.uid());
insert into public.products(name,slug,description,price_bdt,unit,label,sort_order) values
 ('2 Motion Graphics Videos','two-motion-graphics-videos','Two promotional motion graphics videos for your business.',500,'package','POPULAR',1),
 ('Motion Graphics Video + Voice','motion-graphics-with-voice','Promotional motion graphics video with voice-over.',700,'video','WITH VOICE',2),
 ('Video + Campaign Setup & Publishing','video-campaign-setup','Motion graphics video with Meta campaign setup and publishing.',1000,'campaign','LAUNCH READY',3),
 ('1 Month Organic Social Media Marketing','one-month-organic-marketing','One month of organic social media marketing.',7970,'month','MONTHLY',4)
on conflict(slug) do nothing;
