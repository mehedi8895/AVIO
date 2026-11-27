-- Require a Send Money transaction ID for every account type; retain the reference for admin verification.
create or replace function public.avio_submit_order(p_customer_name text,p_customer_phone text,p_sender_phone text,p_transaction_id text,p_business_details text,p_payment_method text,p_account_type text,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; product public.avio_products%rowtype; qty integer; total integer:=0; lines jsonb:='[]'::jsonb; orderrow public.avio_orders%rowtype;
begin
 if length(trim(coalesce(p_customer_name,'')))<2 or length(trim(coalesce(p_customer_phone,'')))<6 or length(trim(coalesce(p_sender_phone,'')))<6 then raise exception 'Invalid customer details'; end if;
 if p_payment_method not in ('bkash','nagad','rocket') or p_account_type not in ('personal','agent') then raise exception 'Invalid payment method'; end if;
 if length(trim(coalesce(p_transaction_id,'')))<3 then raise exception 'Transaction ID required for Send Money verification'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'Invalid items'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  qty:=greatest(1,least(50,coalesce((item->>'quantity')::integer,1)));
  select * into product from public.avio_products where id=(item->>'product_id')::uuid and active=true;
  if not found then raise exception 'Product unavailable'; end if;
  total:=total+product.price_bdt*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'unit_price_bdt',product.price_bdt,'quantity',qty));
 end loop;
 insert into public.avio_orders(customer_name,customer_phone,business_details,items,total_bdt,payment_method,account_type,sender_phone,transaction_id)
 values(left(trim(p_customer_name),120),left(trim(p_customer_phone),40),left(coalesce(p_business_details,''),2000),lines,total,p_payment_method,p_account_type,left(trim(p_sender_phone),40),left(trim(p_transaction_id),100))
 returning * into orderrow;
 return jsonb_build_object('id',orderrow.id,'order_number',orderrow.order_number,'total_bdt',orderrow.total_bdt);
end; $$;

revoke all on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.avio_submit_order(text,text,text,text,text,text,text,jsonb) to anon,authenticated;
