// Shared happy-hour logic + config keys, used by the display page, the public
// read API, and the admin upload API. Kept framework-free so it imports cleanly
// into Vitest (see the pure window predicate below) and any server route.

/** app_setting key under which the current happy-hour image URL is stored. */
export const HAPPY_HOUR_IMAGE_KEY = 'happy_hour_image_url';

/**
 * Fallback shown when no image has ever been uploaded via the admin page.
 * This is the file committed to the repo under public/images, so the display
 * always has something to show even on a fresh database.
 */
export const HAPPY_HOUR_IMAGE_FALLBACK = '/images/happyhour2.png';

/** Blob pathname prefix under which every happy-hour gallery image is stored. */
export const HAPPY_HOUR_BLOB_PREFIX = 'happy-hour/';

/**
 * Gallery caps. Uploads are additive (never auto-deleted), so we bound growth:
 * at most 10 images and 100 MB total across the gallery. When either cap would
 * be exceeded, the upload is refused and the owner is asked to delete one first.
 */
export const MAX_GALLERY_IMAGES = 10;
export const MAX_GALLERY_BYTES = 100 * 1024 * 1024;

/** True for a URL that lives in our Vercel Blob store (vs. the static fallback). */
export function isBlobUrl(url: string | null | undefined): boolean {
  return !!url && url.includes('.blob.vercel-storage.com');
}

/**
 * Pure predicate for the happy-hour window, split out from the timezone
 * extraction in isHappyHour() so it can be unit-tested deterministically
 * (exported for testing). Window: Monday–Friday, 14:50 (inclusive) – 17:45
 * (exclusive), expressed in Luxembourg wall-clock terms by the caller.
 *
 * @param day           JS day-of-week in the target tz (0=Sun … 6=Sat)
 * @param minutesOfDay  hours*60 + minutes in the target tz
 */
export function isWithinHappyHourWindow(day: number, minutesOfDay: number): boolean {
  const isWeekday = day >= 1 && day <= 5;
  const isAfternoon = minutesOfDay >= 14 * 60 + 50 && minutesOfDay < 17 * 60 + 45;
  return isWeekday && isAfternoon;
}
