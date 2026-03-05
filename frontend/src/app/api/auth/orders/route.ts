import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const tokenData = token ? verifyToken(token) : null;
  if (!tokenData) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Get the logged-in user's details to also match guest orders
  const currentUser = await prisma.user.findUnique({
    where: { id: tokenData.sub },
    select: { id: true, email: true, phone: true },
  });

  if (!currentUser) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  // Find all users that could be linked to this person's contact info
  // (covers guest accounts created with same email/phone before registration)
  const linkedUserIds = new Set<string>([currentUser.id]);

  if (currentUser.email) {
    const guestPhone = currentUser.phone?.replace(/\D/g, '');
    const guestEmail = guestPhone ? `${guestPhone}@guest.local` : null;

    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: currentUser.email },
          ...(guestEmail ? [{ email: guestEmail }] : []),
          ...(currentUser.phone ? [{ phone: currentUser.phone }] : []),
        ],
      },
      select: { id: true },
    });

    matchingUsers.forEach(u => linkedUserIds.add(u.id));
  }

  // Also re-assign any guest orders to the real user (optional cleanup)
  if (linkedUserIds.size > 1) {
    const guestIds = Array.from(linkedUserIds).filter(id => id !== currentUser.id);
    await prisma.order.updateMany({
      where: { userId: { in: guestIds } },
      data:  { userId: currentUser.id },
    });
    // After reassignment, just query by current user
    linkedUserIds.clear();
    linkedUserIds.add(currentUser.id);
  }

  const orders = await prisma.order.findMany({
    where: { userId: { in: Array.from(linkedUserIds) } },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
      shippingAddress: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: orders });
}
