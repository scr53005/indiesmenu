// Public read endpoint: returns the current happy-hour image URL for the
// display screen. Falls back to the committed static image when nothing has
// been uploaded yet (or on any DB error) so the signage is never blank.
import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { HAPPY_HOUR_IMAGE_KEY, HAPPY_HOUR_IMAGE_FALLBACK } from '../../../lib/happyHour';

// Always read fresh; the admin can replace the image at any time.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await prisma.app_setting.findUnique({
      where: { key: HAPPY_HOUR_IMAGE_KEY },
    });
    return NextResponse.json({ url: row?.value || HAPPY_HOUR_IMAGE_FALLBACK });
  } catch (error) {
    console.error('[HAPPY HOUR IMAGE] read error:', error);
    return NextResponse.json({ url: HAPPY_HOUR_IMAGE_FALLBACK });
  }
}
