import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = params.id;
  try {
    const sheet = await prisma.sheet.findUnique({ where: { id }, select: { userId: true } });
    if (!sheet || sheet.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    await prisma.sheet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete sheet error', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = params.id;
  try {
    const sheet = await prisma.sheet.findUnique({ where: { id }, select: { userId: true } });
    if (!sheet || sheet.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const body = await req.json();
    const settingsString = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings ?? {});
    const cards = Array.isArray(body.cards) ? body.cards : [];
    await prisma.card.deleteMany({ where: { sheetId: id } });
    const updated = await prisma.sheet.update({
      where: { id },
      data: {
        title: body.title ?? 'Untitled',
        settings: settingsString,
        cards: {
          create: cards.map((c: any, index: number) => ({
            label: c.label ?? '',
            imageUrl: c.imageUrl ?? null,
            assetId: c.assetId ?? null,
            crop: c.crop ? (typeof c.crop === 'string' ? c.crop : JSON.stringify(c.crop)) : null,
            order: Number.isFinite(c.order) ? c.order : index,
            fontFamily: c.fontFamily ?? null,
            fontSizePt: Number.isFinite(c.fontSizePt) ? c.fontSizePt : null,
            bold: typeof c.bold === 'boolean' ? c.bold : null,
          })),
        },
      },
      include: { cards: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json({ sheet: updated });
  } catch (err) {
    console.error('Update sheet error', err);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
