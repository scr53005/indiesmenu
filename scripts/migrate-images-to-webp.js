#!/usr/bin/env node
/**
 * Database Migration Script - Update Image References to WebP
 *
 * Updates all image references in the database from .jpg/.png to .webp
 * Run this AFTER running optimize-images.js with webp:true
 *
 * Usage:
 *   node scripts/migrate-images-to-webp.js --dry-run
 *   node scripts/migrate-images-to-webp.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateImages() {
  console.log('\n📸 Image Reference Migration - JPEG/PNG → WebP\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No database changes will be made\n');
  }

  try {
    // Fetch all dishes with images
    const dishes = await prisma.dishes.findMany({
      where: {
        image: {
          not: null
        }
      },
      select: {
        dish_id: true,
        name: true,
        image: true
      }
    });

    // Fetch all drinks with images
    const drinks = await prisma.drinks.findMany({
      where: {
        image: {
          not: null
        }
      },
      select: {
        drink_id: true,
        name: true,
        image: true
      }
    });

    console.log(`Found ${dishes.length} dishes and ${drinks.length} drinks with images\n`);

    // Update dishes
    console.log('Updating dishes:');
    for (const dish of dishes) {
      const oldImage = dish.image;
      const newImage = oldImage.replace(/\.(jpg|jpeg|png)$/i, '.webp');

      if (oldImage === newImage) {
        console.log(`  ⊘ ${dish.name}: Already WebP (${oldImage})`);
        continue;
      }

      console.log(`  ${DRY_RUN ? '→' : '✓'} ${dish.name}: ${oldImage} → ${newImage}`);

      if (!DRY_RUN) {
        await prisma.dishes.update({
          where: { dish_id: dish.dish_id },
          data: { image: newImage }
        });
      }
    }

    // Update drinks
    console.log('\nUpdating drinks:');
    for (const drink of drinks) {
      const oldImage = drink.image;
      const newImage = oldImage.replace(/\.(jpg|jpeg|png)$/i, '.webp');

      if (oldImage === newImage) {
        console.log(`  ⊘ ${drink.name}: Already WebP (${oldImage})`);
        continue;
      }

      console.log(`  ${DRY_RUN ? '→' : '✓'} ${drink.name}: ${oldImage} → ${newImage}`);

      if (!DRY_RUN) {
        await prisma.drinks.update({
          where: { drink_id: drink.drink_id },
          data: { image: newImage }
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Dishes updated: ${dishes.filter(d => !d.image.endsWith('.webp')).length}`);
    console.log(`Drinks updated: ${drinks.filter(d => !d.image.endsWith('.webp')).length}`);

    if (DRY_RUN) {
      console.log('\n💡 This was a dry run. Run without --dry-run to update database.');
    } else {
      console.log('\n✅ Database migration complete!');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateImages();
