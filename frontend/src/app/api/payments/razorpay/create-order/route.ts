import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    const keyId     = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'your_razorpay_key_id') {
      return NextResponse.json(
        { success: false, message: 'Razorpay keys not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local' },
        { status: 503 }
      );
    }

    // Amount must be in paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);

    const receipt = `rcpt_${Date.now()}`;

    const body = JSON.stringify({
      amount:   amountInPaise,
      currency: 'INR',
      receipt,
    });

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Razorpay create order error:', data);
      return NextResponse.json(
        { success: false, message: data.error?.description || 'Failed to create payment order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success:  true,
      orderId:  data.id,
      amount:   data.amount,
      currency: data.currency,
      key:      keyId,
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
