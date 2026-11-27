import { NextResponse } from 'next/server';import { createClient } from '@supabase/supabase-js';
const db=createClient('https://pkvcnxxuulzglzavzwuf.supabase.co','sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0');
export async function GET(){const {data,error}=await db.from('avio_payment_methods').select('slug,name,personal_number,agent_number,logo_url,sort_order').eq('active',true).order('sort_order');if(error)return NextResponse.json({methods:[]},{status:200});return NextResponse.json({methods:data||[]},{headers:{'Cache-Control':'no-store'}});}
