import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: 'Demo User',
      email: `${userId}@example.local`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const assets = await prisma.asset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Assets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch assets', assets: [] }, { status: 500 });
  }
}