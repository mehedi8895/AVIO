# AVIO Storefront

Full-stack service-commerce website built with Next.js App Router and Supabase Postgres + Auth + RLS. This app uses AVIO-prefixed tables in the existing Supabase project "Gadgets BD" to keep its schema separate from that project's other data.

## Setup
1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env.local` and set the Supabase publishable key.
4. Apply `supabase/migrations/001_store.sql` to the connected Supabase project.
5. Create the admin user in Supabase Auth, then insert its UUID into `public.avio_admin_profiles` (role owner).
6. `npm run dev`

## Deploy
Import this repository into Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then deploy to a Vercel subdomain.

Payment references are submitted for manual verification; this is not an automatic payment gateway. Never put service-role credentials in browser code.
