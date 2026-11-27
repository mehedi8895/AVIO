import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  'https://pkvcnxxuulzglzavzwuf.supabase.co',
  'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0',
);

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^[+()\d\s.-]{6,24}$/;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return badRequest('Order request must be JSON.', 415);
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return badRequest('Order request is too large.', 413);
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return badRequest('Order request is too large.', 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return badRequest('Invalid order request.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Invalid order request.');
    }

    const b = body as Record<string, unknown>;
    const customerName = cleanString(b.customer_name, 120);
    const customerPhone = cleanString(b.customer_phone, 40);
    const senderPhone = cleanString(b.sender_phone, 40);
    const transactionId = cleanString(b.transaction_id, 100);
    const businessDetails = cleanString(b.business_details, 2000);

    if (customerName.length < 2 || !PHONE_PATTERN.test(customerPhone) ||
        !PHONE_PATTERN.test(senderPhone)) {
      return badRequest('Please enter valid customer and sender details.');
    }

    if (!['bkash', 'nagad', 'rocket'].includes(String(b.payment_method)) ||
        !['personal', 'agent'].includes(String(b.account_type))) {
      return badRequest('Invalid payment selection.');
    }

    if (b.sendmoney_confirm !== true) {
      return badRequest('Please confirm you used Send Money only.');
    }

    if (transactionId.length < 3) {
      return badRequest('Transaction ID is required for Send Money verification.');
    }

    if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30) {
      return badRequest('Invalid order items.');
    }

    const items: Array<{ product_id: string; quantity: number }> = [];
    for (const item of b.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return badRequest('Invalid order item.');
      }
      const row = item as Record<string, unknown>;
      const productId = cleanString(row.product_id, 64);
      const quantity = row.quantity;
      if (!UUID_PATTERN.test(productId) || !Number.isInteger(quantity) ||
          (quantity as number) < 1 || (quantity as number) > 50) {
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
      p_payment_method: b.payment_method,
      p_account_type: b.account_type,
      p_items: items,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Order database is not ready yet. Please contact AVIO on WhatsApp to place this order.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { order: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return badRequest('Invalid order request.');
  }
}
