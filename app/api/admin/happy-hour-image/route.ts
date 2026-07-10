// Admin gallery API for the happy-hour display image.
// Protected by middleware.ts (requires the admin_session cookie).
//
// The gallery is backed directly by Vercel Blob: list() under the happy-hour/
// prefix IS the gallery, so uploads are purely additive and nothing is deleted
// on upload. A single app_setting row ('happy_hour_image_url') remembers which
// image is currently active. Growth is bounded by MAX_GALLERY_IMAGES / _BYTES.
//
//   GET    -> { images: [{url, pathname, size, uploadedAt}], activeUrl, totalBytes, count }
//   POST   -> upload a new image (multipart 'file'); becomes the active image
//   PATCH  -> { url } set an existing gallery image as active
//   DELETE -> { url } remove one image from the gallery
import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import prisma from '../../../../lib/prisma';
import {
  HAPPY_HOUR_IMAGE_KEY,
  HAPPY_HOUR_BLOB_PREFIX,
  MAX_GALLERY_IMAGES,
  MAX_GALLERY_BYTES,
  isBlobUrl,
} from '../../../../lib/happyHour';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function getActiveUrl(): Promise<string | null> {
  const row = await prisma.app_setting.findUnique({ where: { key: HAPPY_HOUR_IMAGE_KEY } });
  return row?.value ?? null;
}

async function setActiveUrl(url: string): Promise<void> {
  await prisma.app_setting.upsert({
    where: { key: HAPPY_HOUR_IMAGE_KEY },
    update: { value: url },
    create: { key: HAPPY_HOUR_IMAGE_KEY, value: url },
  });
}

async function clearActive(): Promise<void> {
  await prisma.app_setting.deleteMany({ where: { key: HAPPY_HOUR_IMAGE_KEY } });
}

/** GET — return the gallery + which image is active + capacity usage. */
export async function GET() {
  try {
    const { blobs } = await list({ prefix: HAPPY_HOUR_BLOB_PREFIX });
    const images = blobs
      .map((b) => ({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt }))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const totalBytes = images.reduce((sum, b) => sum + b.size, 0);
    return NextResponse.json({
      images,
      activeUrl: await getActiveUrl(),
      totalBytes,
      count: images.length,
      maxImages: MAX_GALLERY_IMAGES,
      maxBytes: MAX_GALLERY_BYTES,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list gallery';
    console.error('[HAPPY HOUR GALLERY] list error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — upload a new image (additive) and make it the active one. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez JPG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    // Enforce the gallery caps against what's already stored.
    const { blobs } = await list({ prefix: HAPPY_HOUR_BLOB_PREFIX });
    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
    if (blobs.length >= MAX_GALLERY_IMAGES) {
      return NextResponse.json(
        { error: `Galerie pleine (${MAX_GALLERY_IMAGES} images max). Supprimez-en une avant d'en ajouter une nouvelle.` },
        { status: 409 }
      );
    }
    if (totalBytes + file.size > MAX_GALLERY_BYTES) {
      return NextResponse.json(
        { error: `Espace insuffisant (100 Mo max au total). Supprimez une image avant d'en ajouter une nouvelle.` },
        { status: 409 }
      );
    }

    const blob = await put(`${HAPPY_HOUR_BLOB_PREFIX}happyhour-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    });
    await setActiveUrl(blob.url);

    console.warn('[HAPPY HOUR GALLERY] uploaded + activated:', blob.url);
    return NextResponse.json({ success: true, url: blob.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[HAPPY HOUR GALLERY] upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH — set an existing gallery image as the active one. */
export async function PATCH(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (typeof url !== 'string' || !isBlobUrl(url)) {
      return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
    }
    // Confirm the URL really belongs to our gallery before activating it.
    const { blobs } = await list({ prefix: HAPPY_HOUR_BLOB_PREFIX });
    if (!blobs.some((b) => b.url === url)) {
      return NextResponse.json({ error: 'Image introuvable dans la galerie.' }, { status: 404 });
    }
    await setActiveUrl(url);
    console.warn('[HAPPY HOUR GALLERY] activated:', url);
    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set active image';
    console.error('[HAPPY HOUR GALLERY] activate error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — remove one image from the gallery. If it was active, re-point the
 *  active image to the most recent remaining one (or clear it → static fallback). */
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (typeof url !== 'string' || !isBlobUrl(url)) {
      return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
    }

    const wasActive = (await getActiveUrl()) === url;
    await del(url);

    if (wasActive) {
      const { blobs } = await list({ prefix: HAPPY_HOUR_BLOB_PREFIX });
      const remaining = blobs
        .filter((b) => b.url !== url)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      if (remaining.length > 0) {
        await setActiveUrl(remaining[0].url);
      } else {
        await clearActive(); // display falls back to the committed static image
      }
    }

    console.warn('[HAPPY HOUR GALLERY] deleted:', url);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete image';
    console.error('[HAPPY HOUR GALLERY] delete error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
