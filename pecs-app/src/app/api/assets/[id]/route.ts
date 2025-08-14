import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'Demo User', email: `${userId}@example.local` },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const id = params.id;
    const body = await req.json();
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.category === 'string' || body.category === null) data.category = body.category;
    const asset = await prisma.asset.update({ where: { id }, data });
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Asset PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const id = params.id;
    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asset DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}


