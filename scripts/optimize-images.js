#!/usr/bin/env node
/**
 * Image Optimization Script for Indies Menu
 *
 * This script optimizes menu images by:
 * 1. Resizing to reasonable dimensions (max 800x600)
 * 2. Converting to WebP format (better compression)
 * 3. Reducing quality to 75% (imperceptible quality loss)
 *
 * Usage:
 *   node scripts/optimize-images.js
 *   node scripts/optimize-images.js --backup  (creates backup first)
 *   node scripts/optimize-images.js --dry-run (preview only)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputDir: path.join(__dirname, '../public/images'),
  outputDir: path.join(__dirname, '../public/images-optimized'),
  backupDir: path.join(__dirname, '../public/images-backup'),
  maxWidth: 800,
  maxHeight: 600,
  quality: 75,
  skipThreshold: 150 * 1024, // Skip files smaller than 150 KB (already optimized)
  formats: {
    webp: false, // Don't convert to WebP (would break DB references)
    jpeg: true,  // Optimize JPEG files
    png: true,   // Optimize PNG files (preserves transparency)
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CREATE_BACKUP = args.includes('--backup');
const HELP = args.includes('--help') || args.includes('-h');

if (HELP) {
  console.log(`
Image Optimization Script

Usage:
  node scripts/optimize-images.js [options]

Options:
  --dry-run    Preview optimization results without writing files
  --backup     Create backup of original images before optimizing
  --help, -h   Show this help message

Examples:
  node scripts/optimize-images.js --dry-run
  node scripts/optimize-images.js --backup
  `);
  process.exit(0);
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create backup of original images
 */
async function createBackup() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  const files = fs.readdirSync(CONFIG.inputDir)
    .filter(f => f.match(/\.(jpg|jpeg|png)$/i));

  console.log(`\n📦 Creating backup of ${files.length} images...`);

  for (const file of files) {
    const src = path.join(CONFIG.inputDir, file);
    const dest = path.join(CONFIG.backupDir, file);

    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }

  console.log(`✓ Backup created in: ${CONFIG.backupDir}\n`);
}

/**
 * Optimize a single image
 */
async function optimizeImage(file) {
  const inputPath = path.join(CONFIG.inputDir, file);
  const stats = fs.statSync(inputPath);

  if (!stats.isFile()) {
    return null;
  }

  const inputSize = stats.size;
  const results = {
    file,
    inputSize,
    outputs: []
  };

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Safety check 1: Skip small files (already optimized)
    if (inputSize < CONFIG.skipThreshold) {
      return {
        file,
        inputSize,
        skipped: true,
        reason: `Already small (${formatBytes(inputSize)} < ${formatBytes(CONFIG.skipThreshold)} threshold)`,
        wouldSkip: true // Flag for dry-run display
      };
    }

    // Safety check 2: Detect if already optimized by pixel density
    const pixelCount = (metadata.width || 0) * (metadata.height || 0);
    const bytesPerPixel = pixelCount > 0 ? inputSize / pixelCount : 0;
    const isAlreadyOptimal = metadata.width <= CONFIG.maxWidth &&
                             metadata.height <= CONFIG.maxHeight &&
                             bytesPerPixel < 0.5; // Less than 0.5 bytes per pixel = well optimized

    if (isAlreadyOptimal && !DRY_RUN) {
      return {
        file,
        inputSize,
        skipped: true,
        reason: `Already optimal pixel density (${metadata.width}x${metadata.height}, ${bytesPerPixel.toFixed(2)} bytes/pixel)`
      };
    }

    // Store warning for dry-run display
    if (isAlreadyOptimal) {
      results.alreadyOptimal = true;
    }

    // Resize if needed
    const needsResize = metadata.width > CONFIG.maxWidth || metadata.height > CONFIG.maxHeight;

    if (needsResize) {
      image.resize(CONFIG.maxWidth, CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Detect file type
    const isPng = file.match(/\.png$/i);
    const isJpeg = file.match(/\.(jpg|jpeg)$/i);

    // Generate WebP version
    if (CONFIG.formats.webp) {
      const outputFileName = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const outputPath = path.join(CONFIG.outputDir, outputFileName);

      if (!DRY_RUN) {
        await image
          .clone()
          .webp({ quality: CONFIG.quality })
          .toFile(outputPath);

        const outputSize = fs.statSync(outputPath).size;
        results.outputs.push({
          format: 'webp',
          path: outputPath,
          size: outputSize
        });
      } else {
        // Estimate WebP size for dry run (typically 25-30% of original)
        results.outputs.push({
          format: 'webp',
          path: outputFileName,
          size: Math.round(inputSize * 0.27)
        });
      }
    }

    // Generate optimized version in original format
    if (CONFIG.formats.jpeg || CONFIG.formats.png) {
      // Keep original filename (preserve case)
      const outputFileName = file;
      const outputPath = path.join(CONFIG.outputDir, outputFileName);

      if (!DRY_RUN) {
        if (isPng) {
          // PNG: Optimize while preserving transparency
          await image
            .clone()
            .png({
              quality: CONFIG.quality,
              compressionLevel: 9, // Maximum compression
              adaptiveFiltering: true
            })
            .toFile(outputPath);
        } else if (isJpeg) {
          // JPEG: Optimize compression
          await image
            .clone()
            .jpeg({ quality: CONFIG.quality })
            .toFile(outputPath);
        }

        const outputSize = fs.statSync(outputPath).size;
        results.outputs.push({
          format: isPng ? 'png' : 'jpeg',
          path: outputPath,
          size: outputSize
        });
      } else {
        // Estimate size for dry run
        results.outputs.push({
          format: isPng ? 'png' : 'jpeg',
          path: outputFileName,
          size: Math.round(inputSize * (isPng ? 0.40 : 0.35)) // PNG compresses less than JPEG
        });
      }
    }

    return results;
  } catch (error) {
    return {
      file,
      error: error.message
    };
  }
}

/**
 * Main optimization function
 */
async function optimizeImages() {
  console.log('\n🖼️  Indies Menu Image Optimizer\n');
  console.log(`Input:  ${CONFIG.inputDir}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  console.log(`Settings: ${CONFIG.maxWidth}x${CONFIG.maxHeight}, ${CONFIG.quality}% quality`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No files will be written\n');
  }

  // Check if input directory exists
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`\n❌ Error: Input directory not found: ${CONFIG.inputDir}`);
    process.exit(1);
  }

  // Create backup if requested
  if (CREATE_BACKUP && !DRY_RUN) {
    await createBackup();
  }

  // Create output directory
  if (!DRY_RUN && !fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Find all images (case-insensitive)
  const files = fs.readdirSync(CONFIG.inputDir)
    .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
    .sort();

  if (files.length === 0) {
    console.log('\n⚠️  No images found to optimize');
    process.exit(0);
  }

  console.log(`\nFound ${files.length} images to optimize...\n`);

  // Optimize each image
  const results = [];
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let skippedCount = 0;
  let optimizedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await optimizeImage(file);

    if (result) {
      results.push(result);

      if (result.error) {
        console.log(`❌ [${i + 1}/${files.length}] ${file}: ${result.error}`);
      } else if (result.skipped) {
        const skipPrefix = DRY_RUN ? 'Would skip' : 'Skipped';
        console.log(`⊘ [${i + 1}/${files.length}] ${file}: ${skipPrefix} - ${result.reason}`);
        skippedCount++;
      } else {
        const output = result.outputs[0]; // Primary output
        const savings = ((1 - output.size / result.inputSize) * 100).toFixed(1);
        const status = DRY_RUN ? '(preview)' : '';
        const optimalWarning = result.alreadyOptimal ? ' ⚠️  Already optimal - re-optimization may degrade quality' : '';

        console.log(
          `✓ [${i + 1}/${files.length}] ${file}: ` +
          `${formatBytes(result.inputSize)} → ${formatBytes(output.size)} ` +
          `(${savings}% smaller) ${status}${optimalWarning}`
        );

        totalInputSize += result.inputSize;
        totalOutputSize += output.size;
        optimizedCount++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Total images found:     ${files.length}`);
  console.log(`Files to optimize:      ${optimizedCount}`);
  console.log(`Files to skip:          ${skippedCount}`);
  if (optimizedCount > 0) {
    console.log(`Total original size:    ${formatBytes(totalInputSize)}`);
    console.log(`Total optimized size:   ${formatBytes(totalOutputSize)}`);
    console.log(`Total space saved:      ${formatBytes(totalInputSize - totalOutputSize)}`);
    console.log(`Overall reduction:      ${((1 - totalOutputSize / totalInputSize) * 100).toFixed(1)}%`);
  }

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. Run without --dry-run to optimize images.');
  } else {
    console.log(`\n✅ Optimized images saved to: ${CONFIG.outputDir}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review optimized images in images-optimized/');
    console.log('   2. If satisfied, copy them to images/ folder');
    console.log('   3. Update MenuItem.tsx to use Next.js Image component');
    console.log('   4. Remove prefetch code from menu/page.tsx');
  }
  console.log('');
}

// Run the optimizer
optimizeImages().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
