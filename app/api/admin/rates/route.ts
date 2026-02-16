// POST /api/admin/rates
// Returns EUR/USD conversion rates for specific dates (used by accountant reporting page).
// Body: { dates: ["2025-01-15", "2025-01-22", ...] }
// Response: { rates: { "2025-01-15": 1.0834, ... } }

import { NextRequest, NextResponse } from 'next/server';
import { fetchRatesForDates } from '@/lib/currency-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dates } = body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty dates array' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of dates) {
      if (typeof d !== 'string' || !dateRegex.test(d)) {
        return NextResponse.json(
          { error: `Invalid date format: ${d}. Use YYYY-MM-DD.` },
          { status: 400 }
        );
      }
    }

    // Cap at 366 unique dates (one year max)
    const uniqueDates = [...new Set(dates)].slice(0, 366);

    const rateMap = await fetchRatesForDates(uniqueDates);

    // Convert Map to plain object for JSON serialization
    const rates: Record<string, number> = {};
    for (const [date, rate] of rateMap) {
      rates[date] = rate;
    }

    return NextResponse.json({ rates });
  } catch (error: any) {
    console.error('[RATES] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch rates', details: error.message },
      { status: 500 }
    );
  }
}
