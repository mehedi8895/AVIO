import { createBrowserClient } from '@supabase/ssr';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkvcnxxuulzglzavzwuf.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0';
export function supabaseBrowser(){return createBrowserClient(url,key);}
