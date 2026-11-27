import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    'https://pkvcnxxuulzglzavzwuf.supabase.co',
    'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Route handlers and server actions can.
          }
        },
      },
    },
  );
}
