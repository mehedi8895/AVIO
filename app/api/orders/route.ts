import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://pkvcnxxuulzglzavzwuf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zYxVL8KCLEc52uYJ27eQSg_b1K4rRb0';
const ORDER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/avio-order-submit`;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body?.customer_name ||
      !body?.customer_phone ||
      !body?.sender_phone ||
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 30
    ) {
      return NextResponse.json(
        { error: 'Please complete required order details.' },
        { status: 400 },
      );
    }

    if (
      !['bkash', 'nagad', 'rocket'].includes(String(body.payment_method).toLowerCase()) ||
      !['personal', 'agent'].includes(body.account_type)
    ) {
      return NextResponse.json({ error: 'Invalid payment selection.' }, { status: 400 });
    }

    if (body.sendmoney_confirm !== true) {
      return NextResponse.json(
        { error: 'Please confirm you used Send Money only.' },
        { status: 400 },
      );
    }

    if (!body.transaction_id || String(body.transaction_id).trim().length < 3) {
      return NextResponse.json(
        { error: 'Transaction ID is required for Send Money verification.' },
        { status: 400 },
      );
    }

    // Trust only server-observed proxy headers, not an IP value supplied in the request body.
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp =
      forwardedFor?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      'unknown';

    const payload = {
      customer_name: String(body.customer_name).slice(0, 120),
      customer_phone: String(body.customer_phone).slice(0, 40),
      sender_phone: String(body.sender_phone).slice(0, 40),
      transaction_id: String(body.transaction_id).trim().slice(0, 100),
      business_details: String(body.business_details || '').slice(0, 2000),
      payment_method: String(body.payment_method).toLowerCase(),
      account_type: body.account_type,
      sendmoney_confirm: true,
      items: body.items,
      _avio_client_ip: clientIp,
    };

    const upstream = await fetch(ORDER_FUNCTION_URL, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message =
        typeof result?.error === 'string'
          ? result.error
          : 'Order could not be submitted. Please try again.';
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    return NextResponse.json(result, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: 'Order service is temporarily unavailable. Please try again.' },
      { status: 503 },
    );
  }
}
