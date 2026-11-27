import { createBrowserClient } from '@supabase/ssr';
const url='https://pkvcnxxuulzglzavzwuf.supabase.co';
const key='sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0';
export function supabaseBrowser(){return createBrowserClient(url,key);}
