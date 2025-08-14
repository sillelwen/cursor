import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: 'Demo User',
      email: `${userId}@example.local`,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    await ensureUser(userId);
    const sheetId = req.headers.get('x-sheet-id');

    const form = await req.formData();
    const file = form.get('file');
    const name = (form.get('name') as string) || 'upload';
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname((file as File).name || name) || '.png';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), bytes);
    const url = `/uploads/${fileName}`;

    const asset = await prisma.asset.create({ data: { userId, name, url, category: sheetId ? `sheet:${sheetId}` : null } });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed: ' + error }, { status: 500 });
  }
}