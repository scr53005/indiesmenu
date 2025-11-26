// API endpoint to detect newly added images from recent git commits
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * GET /api/admin/detect-new-images
 * Detects image files added in recent git commits (last 5 commits)
 * Returns: { images: string[] } - array of image file names without extension
 */
export async function GET() {
  try {
    console.log('[DETECT IMAGES] Checking git for newly added images...');

    // Get the root directory of the Next.js app
    const projectRoot = process.cwd();
    console.log('[DETECT IMAGES] Project root:', projectRoot);

    // Check last 5 commits for added image files in public/images/
    // Using --diff-filter=A to only show Added files
    const gitCommand = `git log --name-only --diff-filter=A --pretty=format: HEAD~5..HEAD -- public/images/ | sort -u`;

    let stdout: string;
    try {
      const result = await execAsync(gitCommand, { cwd: projectRoot });
      stdout = result.stdout;
    } catch (gitError: any) {
      console.error('[DETECT IMAGES] Git command failed:', gitError.message);

      // Fallback: try checking just the latest commit
      console.log('[DETECT IMAGES] Trying fallback: latest commit only...');
      try {
        const fallbackCommand = `git diff-tree --no-commit-id --name-only --diff-filter=A -r HEAD -- public/images/`;
        const fallbackResult = await execAsync(fallbackCommand, { cwd: projectRoot });
        stdout = fallbackResult.stdout;
      } catch (fallbackError: any) {
        console.error('[DETECT IMAGES] Fallback also failed:', fallbackError.message);
        // Return empty array instead of erroring - might be no git repo or no new images
        return NextResponse.json({
          images: [],
          message: 'No git repository or no new images detected'
        });
      }
    }

    // Parse the output to get file paths
    const filePaths = stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log('[DETECT IMAGES] Found file paths:', filePaths);

    // Filter for image files and extract base names
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const images = filePaths
      .filter(filePath => {
        const ext = path.extname(filePath).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(filePath => {
        const baseName = path.basename(filePath, path.extname(filePath));
        return baseName;
      })
      .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates

    console.log('[DETECT IMAGES] Detected image names:', images);

    return NextResponse.json({
      images,
      count: images.length,
      source: 'git history (last 5 commits)'
    });

  } catch (error: any) {
    console.error('[DETECT IMAGES] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect new images',
        message: error.message,
        images: [] // Return empty array on error
      },
      { status: 500 }
    );
  }
}
