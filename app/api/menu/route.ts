// indiesmenu/app/api/menu/route.ts

import { NextResponse } from 'next/server';
import { getMenuData, getCachedMenuData } from '@/lib/data/menu'; // Import the new function

/**
 * GET /api/menu
 * Returns menu data with aggressive caching and graceful error handling
 * - Server-side cache revalidates every 1 week (604800 seconds)
 * - Browser cache: 3 hours (10800 seconds)
 * - Never returns 500 to customer (uses stale cache on errors)
 */
export async function GET() {
  try {
    // Try to get cached data first (with error recovery)
    const menuData = await getCachedMenuData();

    return NextResponse.json(menuData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        // Browser caching: 3 hours
        'Cache-Control': 'public, max-age=10800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[MENU API] Critical error - cache failure:', error);

    // Last resort: try direct fetch without cache
    try {
      const menuData = await getMenuData();
      return NextResponse.json(menuData, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache', // Don't cache errors
        },
      });
    } catch (fallbackError) {
      console.error('[MENU API] Fallback also failed:', fallbackError);

      // Return minimal menu structure (better than 500)
      return NextResponse.json({
        categories: [],
        dishes: [],
        drinks: [],
        cuissons: [],
        ingredients: [],
        conversion_rate: 1.0,
        error: 'Menu temporarily unavailable'
      }, {
        status: 200, // Still return 200, not 500!
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }
  }
}

export async function OPTIONS() {
  // This handles CORS preflight requests
  return new Response(null, {
    status: 204, // No Content
    headers: {
      'Access-Control-Allow-Origin': '*', // Must match GET, or your specific Vercel frontend domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // List all methods your API will handle
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Add any custom headers your client might send
      'Access-Control-Max-Age': '86400', // Cache preflight results for 24 hours
    },
  });
}