// indiesmenu/app/api/menu/route.ts

import { NextResponse } from 'next/server';
import { getMenuData } from '@/lib/data/menu'; // Import the new function

export async function GET() {
  try {
    const menuData = await getMenuData(); // Call the shared data fetching function

    // Important: Update CORS headers for your deployed environment
    // For local testing during refactoring, you might keep 'http://localhost:3030'
    // But for Vercel, if this is meant for your own frontend on the same domain,
    // you might not even need 'Access-Control-Allow-Origin' or it can be your Vercel domain.
    // If it's for any public client, use '*' (with caution for non-GET methods).
    return NextResponse.json(menuData, {
      headers: {
        'Access-Control-Allow-Origin': '*', // Changed to '*' as discussed, or your specific Vercel frontend domain
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  } catch (error) {
    console.error('Error fetching menu via API:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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