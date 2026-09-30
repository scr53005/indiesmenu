import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  assignedImageFileName,
  isSupportedMenuImageFileName,
  menuImageFileNamesFromGitOutput,
} from '@/lib/menuImageFiles';

const execFileAsync = promisify(execFile);

async function listPublicMenuImages(projectRoot: string): Promise<string[]> {
  const entries = await fs.readdir(path.join(projectRoot, 'public', 'images'), {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && isSupportedMenuImageFileName(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function listGitCandidates(projectRoot: string): Promise<string[] | null> {
  try {
    const [statusResult, logResult] = await Promise.all([
      execFileAsync(
        'git',
        ['-c', 'core.quotepath=false', 'status', '--porcelain=v1', '--untracked-files=all', '--', 'public/images/'],
        { cwd: projectRoot },
      ),
      execFileAsync(
        'git',
        ['-c', 'core.quotepath=false', 'log', '-5', '--name-only', '--diff-filter=A', '--pretty=format:', '--', 'public/images/'],
        { cwd: projectRoot },
      ),
    ]);

    return menuImageFileNamesFromGitOutput(`${statusResult.stdout}\n${logResult.stdout}`);
  } catch (error) {
    // Deployed serverless functions may not include Git metadata. In that case
    // the filesystem plus database assignments provides a deterministic fallback.
    console.warn('[DETECT IMAGES] Git metadata unavailable; scanning public/images', error);
    return null;
  }
}

/**
 * Find menu images that have not yet been associated with a dish or drink.
 * Local development prefers working-tree/recent-commit candidates; deployments
 * without Git metadata fall back to root-level public/images files.
 */
export async function GET() {
  try {
    const projectRoot = process.cwd();
    const [publicImages, gitCandidates, dishes, drinks] = await Promise.all([
      listPublicMenuImages(projectRoot),
      listGitCandidates(projectRoot),
      prisma.dishes.findMany({
        where: { image: { not: null } },
        select: { image: true },
      }),
      prisma.drinks.findMany({
        where: { image: { not: null } },
        select: { image: true },
      }),
    ]);

    const assignedNames = new Set(
      [...dishes, ...drinks]
        .map((item) => assignedImageFileName(item.image))
        .filter((name): name is string => name !== null)
        .map((name) => name.toLowerCase()),
    );

    const publicNameLookup = new Map(publicImages.map((name) => [name.toLowerCase(), name]));
    const candidateNames = gitCandidates === null
      ? publicImages
      : gitCandidates
          .map((name) => publicNameLookup.get(name.toLowerCase()))
          .filter((name): name is string => name !== undefined);

    const images = candidateNames.filter((name) => !assignedNames.has(name.toLowerCase()));
    const source = gitCandidates === null
      ? 'public/images (Git metadata unavailable)'
      : 'Git working tree and last 5 commits';

    console.warn(`[DETECT IMAGES] Found ${images.length} unassigned menu image(s) from ${source}`);

    return NextResponse.json({ images, count: images.length, source });
  } catch (error) {
    console.error('[DETECT IMAGES] Failed to detect menu images:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect new images',
        message: error instanceof Error ? error.message : 'Unknown error',
        images: [],
      },
      { status: 500 },
    );
  }
}
