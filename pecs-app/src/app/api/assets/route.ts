import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const category = searchParams.get('category');
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const assets = await prisma.asset.findMany({
      where: {
        userId,
        ...(q ? { OR: [{ name: { contains: q } }, { url: { contains: q } }] } : {}),
        ...(category === 'uncategorized' ? { category: null } : category ? { category } : {}),
      },
      orderBy: { createdAt: order },
    });
    
    // Get all unique categories for this user
    const categories = await prisma.asset.findMany({
      where: { userId },
      select: { category: true } as any,
      distinct: ['category'] as any,
    });
    
    return NextResponse.json({ 
      assets,
      categories: categories.map((c: any) => c.category).filter(Boolean)
    });
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
    const { id, name, category, ids } = body || {};
    
    // Bulk update by IDs
    if (ids && Array.isArray(ids)) {
      const updateData: any = {};
      if (typeof name === 'string') updateData.name = name;
      if (typeof category === 'string' || category === null) updateData.category = category;
      
      const result = await prisma.asset.updateMany({
        where: { id: { in: ids }, userId },
        data: updateData,
      });
      return NextResponse.json({ updated: result.count });
    }
    
    // Single asset update
    if (!id || (typeof name !== 'string' && typeof category !== 'string' && category !== null)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== userId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    
    const updateData: any = {};
    if (typeof name === 'string') updateData.name = name;
    if (typeof category === 'string' || category === null) updateData.category = category;
    
    const updated = await prisma.asset.update({ where: { id }, data: updateData });
    return NextResponse.json({ asset: updated });
  } catch (error) {
    console.error('Update asset error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to update asset' }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const { ids } = body || {};
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    
    const result = await prisma.asset.deleteMany({
      where: { id: { in: ids }, userId },
    });
    
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete assets error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to delete assets' }, { status });
  }
}