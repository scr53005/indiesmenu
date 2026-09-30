import { describe, expect, it } from 'vitest';
import {
  assignedImageFileName,
  menuImageFileNameFromPath,
  menuImageFileNamesFromGitOutput,
  menuImagePublicPath,
  menuImageSearchName,
} from './menuImageFiles';

describe('menu image filenames', () => {
  it('keeps a root menu image filename and its real extension', () => {
    expect(menuImageFileNameFromPath('public/images/aperolSpritz.jpg')).toBe('aperolSpritz.jpg');
    expect(menuImageFileNameFromPath('public\\images\\special.PNG')).toBe('special.PNG');
  });

  it('rejects nested raw files and reserved display assets', () => {
    expect(menuImageFileNameFromPath('public/images/raw/large.jpg')).toBeNull();
    expect(menuImageFileNameFromPath('public/images/breakfast.jpeg')).toBeNull();
  });

  it('parses untracked, staged, and committed Git output without duplicates', () => {
    const output = [
      '?? public/images/aperolSpritz.jpg',
      'A  public/images/chimay.jpg',
      'public/images/aperolSpritz.jpg',
      'public/images/raw/original.jpg',
    ].join('\n');

    expect(menuImageFileNamesFromGitOutput(output)).toEqual([
      'aperolSpritz.jpg',
      'chimay.jpg',
    ]);
  });

  it('builds the database path from a validated filename', () => {
    expect(menuImagePublicPath('onion_rings.jpg')).toBe('/images/onion_rings.jpg');
    expect(menuImagePublicPath('../secret.jpg')).toBeNull();
  });

  it('uses the basename without the extension for fuzzy matching', () => {
    expect(menuImageSearchName('croquettesCamembert.jpg')).toBe('croquettesCamembert');
  });

  it('normalizes existing database paths for assignment filtering', () => {
    expect(assignedImageFileName('/images/monaco.jpg')).toBe('monaco.jpg');
    expect(assignedImageFileName('legacy.jpg')).toBe('legacy.jpg');
  });
});
