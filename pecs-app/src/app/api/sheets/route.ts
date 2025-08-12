import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sheets = await prisma.sheet.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ sheets });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const sheet = await prisma.sheet.create({ data: { userId, title: body.title ?? 'Untitled', settings: body.settings ?? {}, cards: { create: [] } } });
  return NextResponse.json({ sheet }, { status: 201 });
}