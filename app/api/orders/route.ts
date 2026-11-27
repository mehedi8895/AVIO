import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkvcnxxuulzglzavzwuf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const ORDER_NOTIFICATION_EMAIL = 'personal.mehedi1@gmail.com';

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^[+()\d\s.-]{6,24}$/;
const ALLOWED_PAYMENTS = new Set(['bkash', 'nagad', 'rocket']);
const ALLOWED_ACCOUNT_TYPES = new Set(['personal', 'agent']);

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return !!requestHost && originUrl.host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

function getClientIp(req: Request) {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp && realIp.length <= 64) return realIp;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded && forwarded.length <= 64) return forwarded;
  return null;
}

function htmlEscape(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

async function sendOrderNotification(order: unknown) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.error('AVIO order email notification is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).');
    return;
  }

  const orderJson = JSON.stringify(order, null, 2) || String(order);
  const orderId = order && typeof order === 'object'
    ? cleanString((order as Record<string, unknown>).order_id ?? (order as Record<string, unknown>).id, 80)
    : '';
  const subject = orderId ? `New AVIO order — ${orderId}` : 'New AVIO website order';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [ORDER_NOTIFICATION_EMAIL],
        subject,
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171717"><h2>New AVIO Order</h2><p>A new order was successfully placed on the AVIO website.</p><pre style="white-space:pre-wrap;word-break:break-word;background:#f5f5f5;padding:16px;border-radius:8px">${htmlEscape(orderJson)}</pre></body></html>`,
        text: `New AVIO order\n\nOrder details:\n${orderJson}`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error('AVIO order email notification failed. Resend status:', response.status);
  } catch {
    console.error('AVIO order email notification request failed.');
  }
}

export async function POST(req: Request) {
  if (!SERVICE_KEY) {
    return badRequest('Secure order service is not configured. Please contact AVIO on WhatsApp.', 503);
  }
  if (!sameOrigin(req)) return badRequest('Cross-origin order requests are not allowed.', 403);

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return badRequest('Order request must be JSON.', 415);

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return badRequest('Order request is too large.', 413);

  const clientIp = getClientIp(req);
  if (!clientIp) return badRequest('Unable to verify request source. Please try again.', 400);

  const ipHash = createHmac('sha256', SERVICE_KEY).update(clientIp).digest('hex');
  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-AVIO-Server': 'order-api' } },
  });

  try {
    const { data: allowed, error: limitError } = await db.rpc('avio_check_order_rate_limit', { p_ip_hash: ipHash });
    if (limitError) return badRequest('Order service is temporarily unavailable. Please try later.', 503);
    if (allowed !== true) return badRequest('Too many order attempts. Please wait before trying again.', 429);

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return badRequest('Order request is too large.', 413);

    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return badRequest('Invalid order request.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Invalid order request.');

    const b = body as Record<string, unknown>;
    const customerName = cleanString(b.customer_name, 120);
    const customerPhone = cleanString(b.customer_phone, 40);
    const senderPhone = cleanString(b.sender_phone, 40);
    const transactionId = cleanString(b.transaction_id, 100);
    const businessDetails = cleanString(b.business_details, 2000);
    const paymentMethod = cleanString(b.payment_method, 20);
    const accountType = cleanString(b.account_type, 20);

    if (customerName.length < 2 || !PHONE_PATTERN.test(customerPhone) || !PHONE_PATTERN.test(senderPhone)) {
      return badRequest('Please enter valid customer and sender details.');
    }
    if (!ALLOWED_PAYMENTS.has(paymentMethod) || !ALLOWED_ACCOUNT_TYPES.has(accountType)) return badRequest('Invalid payment selection.');
    if (b.sendmoney_confirm !== true) return badRequest('Please confirm you used Send Money only.');
    if (transactionId.length < 3) return badRequest('Transaction ID is required for Send Money verification.');
    if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30) return badRequest('Invalid order items.');

    const items: Array<{ product_id: string; quantity: number }> = [];
    for (const item of b.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return badRequest('Invalid order item.');
      const row = item as Record<string, unknown>;
      const productId = cleanString(row.product_id, 64);
      const quantity = row.quantity;
      if (!UUID_PATTERN.test(productId) || !Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 50) {
        return badRequest('Invalid product or quantity.');
      }
      items.push({ product_id: productId, quantity: quantity as number });
    }

    const { data, error } = await db.rpc('avio_submit_order', {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_sender_phone: senderPhone,
      p_transaction_id: transactionId,
      p_business_details: businessDetails,
      p_payment_method: paymentMethod,
      p_account_type: accountType,
      p_items: items,
    });
    if (error) return badRequest('Order could not be submitted. Please verify your details or contact AVIO on WhatsApp.', 400);

    // Best-effort email: provider failure must not cancel a successfully saved order.
    await sendOrderNotification(data);

    return NextResponse.json({ order: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return badRequest('Order service is temporarily unavailable.', 503);
  }
}
