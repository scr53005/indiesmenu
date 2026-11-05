// Which menu images next/image may resize. Local /images/... files and Vercel Blob uploads
// (app/api/admin/menu-image, stored at 1200px) are resized to the card size; any other host
// is shown as-is, because next/image refuses hosts missing from next.config remotePatterns.
// Relative import only: tested file (CLAUDE.md alias gotcha).

/** Must match images.remotePatterns in next.config.ts. */
export const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

export function isOptimizableImage(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * The `sizes` hint for a dish/drink card: two columns on a phone (.category-items-grid,
 * minmax(150px, 1fr)), narrow cards on wider screens. Without it next/image offers only
 * 1x/2x of the 800px intrinsic width, so a 3x phone downloaded a 1920px file for a 155px box.
 */
export const MENU_CARD_IMAGE_SIZES = '(max-width: 640px) 50vw, 250px';
