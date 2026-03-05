import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page   = parseInt(searchParams.get('page') || '1');
    const limit  = parseInt(searchParams.get('limit') || '20');
    const skip   = (page - 1) * limit;
    const role   = searchParams.get('role') || undefined;

    const where: Record<string, unknown> = {
      role: { not: 'ADMIN' }, // hide admin accounts
    };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email:     { contains: search } },
        { firstName: { contains: search } },
        { lastName:  { contains: search } },
        { phone:     { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, firstName: true, lastName: true,
          email: true, phone: true, role: true, status: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { users, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ success: false, message: 'Error fetching users' }, { status: 500 });
  }
}
