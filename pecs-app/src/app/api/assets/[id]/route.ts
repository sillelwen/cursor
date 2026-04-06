import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = requireUserId(req);
    const id = params.id;
    const body = await req.json();
    
    // Verify ownership
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== userId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.category === 'string' || body.category === null) data.category = body.category;
    
    const updated = await prisma.asset.update({ where: { id }, data });
    return NextResponse.json({ asset: updated });
  } catch (error) {
    console.error('Asset PATCH error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to update asset' }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = requireUserId(req);
    const id = params.id;
    
    // Verify ownership
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== userId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asset DELETE error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Failed to delete asset' }, { status });
  }
}


