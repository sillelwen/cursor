import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const assets = await prisma.asset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Assets API error:', error);
    return NextResponse.json({ error: 'Failed to fetch assets', assets: [] }, { status: 500 });
  }
}