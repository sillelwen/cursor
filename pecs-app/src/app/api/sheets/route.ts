import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sheets = await prisma.sheet.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { cards: { orderBy: { order: 'asc' } } },
  });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultSheetSettings: true } });
  return NextResponse.json({ sheets, defaultSettings: user?.defaultSheetSettings ? JSON.parse(user.defaultSheetSettings) : null });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  // Ensure user exists (foreign key)
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, name: 'User' } });
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
    include: { cards: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json({ sheet }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  // Save default settings for the user
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  await prisma.user.upsert({
    where: { id: userId },
    update: { defaultSheetSettings: JSON.stringify(body.settings ?? {}) },
    create: { id: userId, name: 'User', defaultSheetSettings: JSON.stringify(body.settings ?? {}) },
  });
  return NextResponse.json({ ok: true });
}