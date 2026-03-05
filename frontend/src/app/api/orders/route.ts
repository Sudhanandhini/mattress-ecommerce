import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

function generateOrderNumber() {
  const ts  = Date.now().toString().slice(-8);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${ts}${rnd}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, address, city, state, pincode, notes, items, subtotal, tax, total } = body;

    if (!name || !phone || !address || !items?.length) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Check if request comes from a logged-in user
    const authHeader = request.headers.get('Authorization');
    const tokenStr   = authHeader?.replace('Bearer ', '');
    const tokenData  = tokenStr ? verifyToken(tokenStr) : null;

    let user;
    if (tokenData) {
      // Use the authenticated user's account
      user = await prisma.user.findUnique({ where: { id: tokenData.sub } });
    }

    if (!user) {
      // Find or create guest user by email/phone
      const guestEmail = email || `${phone.replace(/\D/g, '')}@guest.local`;
      const firstName  = name.split(' ')[0] || name;
      const lastName   = name.split(' ').slice(1).join(' ') || '-';

      user = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email:    guestEmail,
            password: randomUUID(),
            firstName,
            lastName,
            phone,
          },
        });
      }
    }

    // Create shipping address
    const shippingAddress = await prisma.address.create({
      data: {
        userId:       user.id,
        fullName:     name,
        phone,
        addressLine1: address,
        city:         city || 'Bangalore',
        state:        state || 'Karnataka',
        pincode:      pincode || '000000',
      },
    });

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber:      generateOrderNumber(),
        userId:           user.id,
        shippingAddressId: shippingAddress.id,
        paymentMethod:    'COD',
        paymentStatus:    'PENDING',
        status:           'PENDING',
        subtotal,
        tax,
        shippingCharge:   0,
        discount:         0,
        total,
        customerNotes:    notes || null,
        items: {
          create: items.map((item: {
            productId: string;
            variantId?: string;
            productName: string;
            variantLabel?: string;
            price: number;
            quantity: number;
          }) => ({
            productId:   item.productId,
            variantId:   item.variantId && item.variantId !== item.productId + '-default' ? item.variantId : null,
            productName: item.productName,
            variantName: item.variantLabel || null,
            quantity:    item.quantity,
            price:       item.price,
            discount:    0,
            total:       item.price * item.quantity,
          })),
        },
        statusHistory: {
          create: { status: 'PENDING', notes: 'Order placed by customer' },
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: { orderNumber: order.orderNumber, orderId: order.id } });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create order' }, { status: 500 });
  }
}
