# AVIO — Full-stack service store

AVIO is a Next.js 15 storefront backed by Supabase Postgres, Supabase Auth, row-level security, and server-side order validation. The AVIO tables are namespaced (avio_products, avio_orders, avio_admin_profiles) so they remain separate from other tables in the shared Gadgets BD project.

## Deploy (no environment variables needed)
1. Open Vercel and choose Add New → Project.
2. Import the GitHub repository mehedi8895/AVIO.
3. Keep the detected Next.js settings and click Deploy. The public Supabase URL and publishable key are already configured as safe client keys in the app.
4. When the deployment is ready, open https://YOUR-VERCEL-DOMAIN/admin/setup.
5. Create the first AVIO admin account. If Supabase asks for email confirmation, confirm it, return to the setup page, choose Sign in & finish setup, and complete initialization.
6. Then open /admin to manage orders and add/hide services.

## Supabase
The migration in supabase/migrations/001_store.sql has been applied to the existing Supabase project Gadgets BD. The four requested services are seeded. The order API calls the avio_submit_order RPC, which loads current product prices from the database and calculates totals server-side.

## Features
- Responsive storefront, service cards, cart and direct order.
- bKash / Nagad / Rocket manual Send Money payment instructions.
- Personal payment asks sender number + transaction ID; Agent payment asks agent number.
- Orders store customer, items, payment references and status.
- Admin sign-in, one-time first-owner setup, order/payment status management, product creation and publish/hide.
- No Supabase service-role key is exposed in the browser.

Payment is manual verification, not an automatic payment gateway. After deploy, initialize the first admin immediately and keep its credentials private.
