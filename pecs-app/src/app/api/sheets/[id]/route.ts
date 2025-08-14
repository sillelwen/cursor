import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'Demo User', email: `${userId}@example.local` },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const id = params.id;
    const sheet = await prisma.sheet.findFirst({ where: { id, userId }, include: { cards: { orderBy: { order: 'asc' } } } });
    if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ sheet });
  } catch (error) {
    console.error('Sheet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch sheet' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const id = params.id;
    const body = await req.json();
    const settingsString = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings ?? {});
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const updated = await prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { sheetId: id } });
      const sheet = await tx.sheet.update({
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
      return sheet;
    });
    return NextResponse.json({ sheet: updated });
  } catch (error) {
    console.error('Sheet PUT error:', error);
    return NextResponse.json({ error: 'Failed to update sheet' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const id = params.id;
    await prisma.sheet.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Sheet DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete sheet' }, { status: 500 });
  }
}


