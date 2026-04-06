import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Add background color
 */
async function addBackgroundToPng(bytes: Buffer, hexColor: string): Promise<Buffer> {
  const img = sharp(bytes).png();
  const metadata = await img.metadata();

  const hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const background = sharp({
    create: {
      width: metadata.width ?? 512,
      height: metadata.height ?? 512,
      channels: 3,
      background: { r, g, b },
    },
  });

  return background
    .composite([{ input: await img.toBuffer(), blend: 'over' }])
    .png()
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();

    const url: string | undefined = body?.url;
    const name: string = (body?.name as string) || 'image';
    const backgroundColor: string | undefined = body?.backgroundColor;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 400 });
    }

    const arrayBuffer = await res.arrayBuffer();
    let bytes = Buffer.from(arrayBuffer);

    const guessedExt = (() => {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('image/jpeg')) return '.jpg';
      if (contentType.includes('image/png')) return '.png';
      if (contentType.includes('image/webp')) return '.webp';
      if (contentType.includes('image/gif')) return '.gif';
      return path.extname(new URL(url).pathname) || '.png';
    })();

    // Add bgColor to PNG
    if (guessedExt === '.png' && backgroundColor) {
      try {
        const buffer = Buffer.from(bytes);
        const processedBuffer = await addBackgroundToPng(buffer, backgroundColor);
        bytes = Buffer.from(processedBuffer);
      } catch (err) {
        console.error('Error adding background:', err);
      }
    }

    const fileName = `${crypto.randomUUID()}${guessedExt}`;
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), bytes);

    const localUrl = `/uploads/${fileName}`;

    const asset = await prisma.asset.create({
      data: { userId, name, url: localUrl },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Upload-from-url API error:', error);
    const status = String(error).includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: 'Upload from URL failed' }, { status });
  }
}