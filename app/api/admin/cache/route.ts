import { NextRequest, NextResponse } from 'next/server';
import { invalidateMenuCache } from '@/lib/data/menu';

/**
 * POST /api/admin/cache
 * Invalidates the server-side menu cache
 * Call this after creating/updating/deleting dishes or drinks
 */
export async function POST(request: NextRequest) {
  try {
    invalidateMenuCache();

    return NextResponse.json({
      success: true,
      message: 'Menu cache invalidated successfully'
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
