import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieOptions = {
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  priority?: 'low' | 'medium' | 'high';
  partitioned?: boolean;
};

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkvcnxxuulzglzavzwuf.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0',
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(values: CookieToSet[]) {
          try {
            values.forEach(({ name, value, options }) => {
              jar.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies; middleware/route handlers can.
          }
        },
      },
    },
  );
}
