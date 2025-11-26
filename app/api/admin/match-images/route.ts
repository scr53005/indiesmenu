// API endpoint for fuzzy matching image names to dishes and drinks
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Match = {
  id: number;
  name: string;
  type: 'dish' | 'drink';
  similarity: number;
  currentImage: string | null;
};

type ImageMatch = {
  imageName: string;
  matches: Match[];
};

/**
 * POST /api/admin/match-images
 * Body: { imageNames: string[] } - array of image file names (without extension)
 * Returns: { results: ImageMatch[] } - top 3 matches per image
 */
export async function POST(req: NextRequest) {
  try {
    const { imageNames } = await req.json();

    if (!Array.isArray(imageNames) || imageNames.length === 0) {
      return NextResponse.json(
        { error: 'imageNames must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log('[MATCH IMAGES] Processing:', imageNames);

    // Enable pg_trgm extension if not already enabled
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;

    const results: ImageMatch[] = [];

    for (const imageName of imageNames) {
      const searchTerm = imageName.toLowerCase();
      console.log(`[MATCH IMAGES] Searching for: "${searchTerm}"`);

      // Search in dishes using trigram similarity
      const dishMatches = await prisma.$queryRaw<Array<{
        dish_id: number;
        name: string;
        image: string | null;
        similarity: number;
      }>>`
        SELECT
          dish_id,
          name,
          image,
          similarity(lower(name), ${searchTerm}) as similarity
        FROM dishes
        WHERE similarity(lower(name), ${searchTerm}) > 0.1
        ORDER BY similarity DESC
        LIMIT 3
      `;

      // Search in drinks using trigram similarity
      const drinkMatches = await prisma.$queryRaw<Array<{
        drink_id: number;
        name: string;
        image: string | null;
        similarity: number;
      }>>`
        SELECT
          drink_id,
          name,
          image,
          similarity(lower(name), ${searchTerm}) as similarity
        FROM drinks
        WHERE similarity(lower(name), ${searchTerm}) > 0.1
        ORDER BY similarity DESC
        LIMIT 3
      `;

      // Combine and sort by similarity
      const allMatches: Match[] = [
        ...dishMatches.map(d => ({
          id: d.dish_id,
          name: d.name,
          type: 'dish' as const,
          similarity: Number(d.similarity),
          currentImage: d.image,
        })),
        ...drinkMatches.map(d => ({
          id: d.drink_id,
          name: d.name,
          type: 'drink' as const,
          similarity: Number(d.similarity),
          currentImage: d.image,
        })),
      ].sort((a, b) => b.similarity - a.similarity).slice(0, 3);

      console.log(`[MATCH IMAGES] Found ${allMatches.length} matches for "${imageName}":`,
        allMatches.map(m => `${m.name} (${(m.similarity * 100).toFixed(1)}%)`));

      results.push({
        imageName,
        matches: allMatches,
      });
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('[MATCH IMAGES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to match images', message: error.message },
      { status: 500 }
    );
  }
}
