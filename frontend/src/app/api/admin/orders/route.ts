import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status  = searchParams.get('status') || undefined;
    const search  = searchParams.get('search') || '';
    const page    = parseInt(searchParams.get('page') || '1');
    const limit   = parseInt(searchParams.get('limit') || '20');
    const skip    = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.orderNumber = { contains: search };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          items: {
            include: {
              product: { select: { name: true, slug: true } },
              variant: { select: { size: true, thickness: true, firmness: true } },
            },
          },
          shippingAddress: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { orders, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ success: false, message: 'Error fetching orders' }, { status: 500 });
  }
}
