import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'Demo User', email: `${userId}@example.local` },
  });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const sheets = await prisma.sheet.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({ sheets });
  } catch (error) {
    console.error('Sheets GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const body = await req.json();
    const settingsString = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings ?? {});
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const sheet = await prisma.sheet.create({
      data: {
        userId,
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
    });
    return NextResponse.json({ sheet }, { status: 201 });
  } catch (error) {
    console.error('Sheets POST error:', error);
    return NextResponse.json({ error: 'Failed to create sheet' }, { status: 500 });
  }
}