import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const assets = await prisma.asset.findMany({
      where: {
        userId,
        ...(q ? { OR: [{ name: { contains: q } }, { url: { contains: q } }] } : {}),
      },
      orderBy: { createdAt: order },
    });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Assets API error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to fetch assets', assets: [] }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const { id, name } = body || {};
    if (!id || typeof name !== 'string') {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== userId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const updated = await prisma.asset.update({ where: { id }, data: { name } });
    return NextResponse.json({ asset: updated });
  } catch (error) {
    console.error('Rename asset error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to rename asset' }, { status });
  }
}