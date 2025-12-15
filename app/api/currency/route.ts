// app/api/currency/route.ts
import { NextResponse } from 'next/server';
import { fetchCurrencyRate } from '@/lib/currency-service';

// GET handler for fetching the latest EUR/USD rate
// This is a thin wrapper around the shared business logic
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const todayStr = searchParams.get('today') || new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  if (isNaN(today.getTime())) {
    console.warn('[CURRENCY API] Invalid today parameter, using current date:', todayStr);
    today.setTime(new Date().getTime());
  }

  // Call the shared business logic
  const rate = await fetchCurrencyRate(today);

  return NextResponse.json(rate);
}