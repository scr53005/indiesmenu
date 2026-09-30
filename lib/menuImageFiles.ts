import path from 'path';

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Root-level public assets that belong to the site/signage rather than a menu row.
const RESERVED_IMAGE_FILENAMES = new Set([
  'edenred.svg',
  'biere-32x30.jpg',
  'breakfast.jpeg',
  'burger-32x28.jpg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'frontentrance.jpg',
  'happyhour.jpeg',
  'happyhour2.png',
  'indiesext1600x878.jpg',
  'indiesint1600x878.jpg',
  'innopay-blue.png',
  'innopay-blue-192.png',
  'innopay-blue-512.png',
  'innopay-logo.png',
  'pluxee-logo.jpeg',
  'satispay-logo.png',
  'screenshotnw.jpg',
  'screenshotnw-1125x1300.jpg',
  'sticker1.jpg',
]);

export function isSupportedMenuImageFileName(fileName: string): boolean {
  if (!fileName || fileName !== path.basename(fileName) || fileName.includes('\\')) return false;

  const lowerName = fileName.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(lowerName)) &&
    !RESERVED_IMAGE_FILENAMES.has(lowerName);
}

/** Convert a Git-reported path into a root-level public/images menu filename. */
export function menuImageFileNameFromPath(filePath: string): string | null {
  const normalized = filePath.trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
  const prefix = 'public/images/';

  if (!normalized.startsWith(prefix)) return null;

  const relativePath = normalized.slice(prefix.length);
  if (relativePath.includes('/') || !isSupportedMenuImageFileName(relativePath)) return null;

  return relativePath;
}

/** Parse either `git status --porcelain` or `git log --name-only` output. */
export function menuImageFileNamesFromGitOutput(output: string): string[] {
  const names = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => (/^[?! MADRCU]{2} /.test(line) ? line.slice(3) : line.trim()))
    .map(menuImageFileNameFromPath)
    .filter((name): name is string => name !== null);

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function menuImageSearchName(fileName: string): string {
  return path.parse(fileName).name;
}

export function menuImagePublicPath(fileName: string): string | null {
  return isSupportedMenuImageFileName(fileName) ? `/images/${fileName}` : null;
}

export function assignedImageFileName(imagePath: string | null): string | null {
  if (!imagePath) return null;

  const normalized = imagePath.replace(/\\/g, '/');
  const fileName = normalized.slice(normalized.lastIndexOf('/') + 1);
  return isSupportedMenuImageFileName(fileName) ? fileName : null;
}
