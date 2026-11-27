import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function GET() { const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); const {data,error}=await db.from('avio_products').select('id,name,slug,description,price_bdt,unit,label,active').eq('active',true).order('sort_order'); if(error)return NextResponse.json({error:'Could not load products'},{status:500}); return NextResponse.json({products:data}); }
