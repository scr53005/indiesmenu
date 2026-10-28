import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { menuError } from '@/lib/admin/menu-response';

export const runtime = 'nodejs';
// Leave multipart overhead below Vercel's request-body limit.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Choisissez une image JPG, PNG ou WebP.' }, { status: 400 });
    }
    if (!file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'L’image doit peser entre 1 octet et 4 Mo.' }, { status: 400 });
    }
    let optimized: Buffer;
    try {
      optimized = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 })
        .rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 }).toBuffer();
    } catch {
      return NextResponse.json({ error: 'Fichier image illisible ou dimensions trop grandes.' }, { status: 400 });
    }
    // Replacing an association never removes the old, potentially shared image.
    const blob = await put('menu/menu.webp', optimized, {
      access: 'public', addRandomSuffix: true, contentType: 'image/webp',
    });
    console.warn('[ADMIN MENU] Image uploaded:', blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (error) { return menuError(error); }
}
