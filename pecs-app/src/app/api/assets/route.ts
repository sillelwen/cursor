import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const assets = await prisma.asset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ assets });
}