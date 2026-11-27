import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
export async function GET() { const db = await supabaseServer(); const { data, error } = await db.from('products').select('id,name,slug,description,price_bdt,unit,label,active').eq('active', true).order('sort_order'); if (error) return NextResponse.json({ error: 'Could not load products' }, { status: 500 }); return NextResponse.json({ products: data }); }
