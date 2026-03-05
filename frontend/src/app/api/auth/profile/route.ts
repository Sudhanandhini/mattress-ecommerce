import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function getUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  return token ? verifyToken(token) : null;
}

// GET — fetch current profile
export async function GET(request: NextRequest) {
  const tokenData = getUser(request);
  if (!tokenData) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: tokenData.sub },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: user });
}

// PATCH — update profile info
export async function PATCH(request: NextRequest) {
  const tokenData = getUser(request);
  if (!tokenData) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { firstName, lastName, phone, email } = await request.json();

  // If email is being changed, check it isn't taken by another user
  if (email !== undefined) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: tokenData.sub } },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Email is already in use' }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: tokenData.sub },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName  !== undefined && { lastName }),
      ...(phone     !== undefined && { phone }),
      ...(email     !== undefined && { email }),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
