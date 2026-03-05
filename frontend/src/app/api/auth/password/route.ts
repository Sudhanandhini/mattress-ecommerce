import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const tokenData = token ? verifyToken(token) : null;
  if (!tokenData) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, message: 'Both passwords required' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ success: false, message: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: tokenData.sub } });
  if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });

  if (!verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: tokenData.sub },
    data:  { password: hashPassword(newPassword) },
  });

  return NextResponse.json({ success: true, message: 'Password updated successfully' });
}
