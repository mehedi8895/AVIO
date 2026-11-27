import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkvcnxxuulzglzavzwuf.supabase.co';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0';
const LEGACY_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmNueHh1dWx6Z2x6YXZ6d3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDQyNTIsImV4cCI6MjEwNzk4MDI1Mn0.X_2al_Lq7trIOwhf3tM2JNn0d0GjTIvLIhJFuabmdHk';
const MAX_BODY_BYTES = 16 * 1024;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return !!requestHost && originUrl.host.toLowerCase() === requestHost.toLowerCase();
  } catch { return false; }
}
function getClientIp(req: Request) {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp && realIp.length <= 64) return realIp;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded && forwarded.length <= 64) return forwarded;
  return null;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Cross-origin order requests are not allowed.', 403);
  if (!(req.headers.get('content-type') || '').toLowerCase().includes('application/json')) return error('Order request must be JSON.', 415);
  const length = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return error('Order request is too large.', 413);

  const clientIp = getClientIp(req);
  if (!clientIp) return error('Unable to verify request source. Please try again.', 400);

  let raw: string;
  try { raw = await req.text(); } catch { return error('Invalid order request.', 400); }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return error('Order request is too large.', 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return error('Invalid order request.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid order request.', 400);

  const payload = { ...(body as Record<string, unknown>), _avio_client_ip: clientIp };
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/avio-order-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${LEGACY_ANON_JWT}`,
        ...(req.headers.get('origin') ? { Origin: req.headers.get('origin')! } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({ error: 'Order service returned an invalid response.' }));
    return NextResponse.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return error('Order service is temporarily unavailable. Please try again.', 503);
  }
}
