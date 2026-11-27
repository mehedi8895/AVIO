# AVIO production security and email setup

## Required Vercel environment variables

### Secure order API

1. Open Vercel Dashboard → AVIO project → Settings → Environment Variables.
2. Add `SUPABASE_SERVICE_ROLE_KEY`.
3. Value: the project's service_role secret from Supabase Dashboard → Project Settings → API Keys. Use the secret/service role key, never the publishable/anon key.
4. Apply to Production (and Preview only if you intend to test checkout there).
5. Redeploy the latest commit.

Never prefix this variable with `NEXT_PUBLIC_`, expose it in client code, or commit its value to GitHub. It bypasses Row Level Security and must remain server-only.

## Order email notification

When an order is successfully saved, AVIO sends its order details to **personal.mehedi1@gmail.com** using Resend. Email delivery is best-effort and will not cancel a saved order.

1. Create/sign in to a Resend account at https://resend.com/.
2. Add and verify a domain you own in Resend. Use an email address on that verified domain as the sender.
3. Create a Resend API key with email sending permission.
4. In Vercel → AVIO project → Settings → Environment Variables, add:
   - `RESEND_API_KEY`: your Resend API key (keep it secret).
   - `RESEND_FROM_EMAIL`: sender in the form `AVIO Orders <orders@your-verified-domain.com>`, using your own verified domain/address.
5. Apply to Production and redeploy.

Do not put the Resend API key in a `NEXT_PUBLIC_` variable or in GitHub. The notification recipient is already set server-side to personal.mehedi1@gmail.com.

## What was hardened

- Browser-origin check on the order route.
- Per-IP rate limit: 5 order attempts/minute and 20/hour. IPs are HMAC-hashed before storage.
- Request body limit and strict order input validation.
- Order RPC access revoked from anon and authenticated; only service_role can call it.
- Payment transaction reference uniqueness.
- Security headers and SECURITY DEFINER search_path hardening.

## Still required in Supabase Dashboard

- Enable leaked/compromised password protection in Authentication → Password Security.
- Review Auth session settings, require email confirmation if appropriate, and enable MFA for the owner/admin account.
- Keep service-role key only in Vercel server environment variables; rotate it immediately if it was ever exposed.
- Run Security Advisor after deployment and resolve remaining warnings. The shared Supabase project contains other app schemas too; review those separately.
