// lib/currency-service.ts
// Shared business logic for currency rate fetching
// Can be imported by both API routes and other server-side code

import { parseStringPromise } from 'xml2js';
import prisma from '@/lib/prisma';

// Interface for the return type
export interface CurrencyRate {
  date: string; // ISO string for JSON serialization
  conversion_rate: number;
  isFresh: boolean;
}

/**
 * Fetches the latest EUR/USD rate with fallback strategy
 *
 * Strategy:
 * 1. Check database for rate matching the requested date
 * 2. If not found or outdated, fetch from ECB XML feed
 * 3. Save new rate to database
 * 4. Fallback to latest DB rate if ECB fails
 * 5. Return default 1.0 if all sources fail
 *
 * @param today - Date object for which to fetch the rate
 * @returns CurrencyRate object
 */
export async function fetchCurrencyRate(today: Date): Promise<CurrencyRate> {
  const todayStr = today.toISOString().split('T')[0];

  // Step 1: Fetch the latest row from currency_conversion, ordered by date descending
  let latestRate;
  try {
    latestRate = await prisma.currency_conversion.findFirst({
      orderBy: { date: 'desc' },
    });
  } catch (dbError) {
    console.warn('[CURRENCY] Failed to fetch latest rate from DB:', dbError);
    latestRate = null;
  }

  // Step 2: Check if the latest row is for today
  if (latestRate && latestRate.date.toISOString().split('T')[0] === todayStr) {
    return {
      date: latestRate.date.toISOString(),
      conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
      isFresh: false,
    };
  }

  // Step 3: Try to fetch rate from ECB's daily XML feed
  try {
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    if (!response.ok) {
      console.warn('[CURRENCY] Failed to fetch ECB rates, status:', response.status);
      // Fallback to latest DB rate if available
      if (latestRate) {
        return {
          date: latestRate.date.toISOString(),
          conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
          isFresh: false,
        };
      }
      // Both ECB and DB failed
      console.warn('[CURRENCY] No rate in DB, using default rate of 1.0');
      return {
        date: today.toISOString(),
        conversion_rate: 1.0,
        isFresh: false,
      };
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const cube = parsed['gesmes:Envelope']['Cube'][0]['Cube'][0]['Cube'];
    const usdRate = cube.find((entry: any) => entry['$'].currency === 'USD')['$'].rate;
    const ecbDateStr = parsed['gesmes:Envelope']['Cube'][0]['Cube'][0]['$'].time;

    const rate = parseFloat(usdRate);
    const ecbDate = new Date(ecbDateStr);

    // Step 4: Check if ECB date already exists in the database
    try {
      const existingEcbRate = await prisma.currency_conversion.findUnique({
        where: { date: ecbDate },
      });
      if (existingEcbRate) {
        return {
          date: existingEcbRate.date.toISOString(),
          conversion_rate: parseFloat(existingEcbRate.conversion_rate.toString()),
          isFresh: false,
        };
      }
    } catch (dbError) {
      console.warn('[CURRENCY] Failed to check for existing ECB date in DB:', dbError);
      // Proceed to save the rate, but be cautious of potential duplicates
    }

    // Step 5: Determine freshness (ECB date is today or not)
    const isFresh = ecbDate.toISOString().split('T')[0] === todayStr;

    // Step 6: Save the new rate to the database
    try {
      await prisma.currency_conversion.create({
        data: {
          date: ecbDate,
          conversion_rate: rate,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        console.warn('[CURRENCY] ECB rate for date already exists in DB:', ecbDate.toISOString().split('T')[0]);
      } else {
        console.warn('[CURRENCY] Failed to save ECB rate to database:', dbError);
      }
      // Continue with the ECB rate even if DB save fails
    }

    return {
      date: ecbDate.toISOString(),
      conversion_rate: rate,
      isFresh,
    };
  } catch (ecbError) {
    console.warn('[CURRENCY] Failed to fetch or parse ECB rate:', ecbError);
    // Fallback to latest DB rate if available
    if (latestRate) {
      return {
        date: latestRate.date.toISOString(),
        conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
        isFresh: false,
      };
    }
    // Both ECB and DB failed
    console.warn('[CURRENCY] No rate in DB, using default rate of 1.0');
    return {
      date: today.toISOString(),
      conversion_rate: 1.0,
      isFresh: false,
    };
  }
}

/**
 * Fetches EUR/USD rates for a specific set of dates (used by accountant reporting).
 *
 * Strategy:
 * 1. Batch-query currency_conversion table for all requested dates
 * 2. For missing dates (weekends, holidays), use the nearest preceding rate in DB
 * 3. Returns a Map<dateString, eurUsdRate>
 *
 * @param dates - Array of date strings in YYYY-MM-DD format
 * @returns Map from date string to EUR/USD rate
 */
export async function fetchRatesForDates(dates: string[]): Promise<Map<string, number>> {
  const rateMap = new Map<string, number>();
  if (dates.length === 0) return rateMap;

  // Step 1: Batch-query DB for all requested dates
  const dateObjects = dates.map(d => new Date(d + 'T00:00:00.000Z'));
  try {
    const existingRates = await prisma.currency_conversion.findMany({
      where: {
        date: { in: dateObjects },
      },
    });

    for (const rate of existingRates) {
      const dateStr = rate.date.toISOString().split('T')[0];
      rateMap.set(dateStr, parseFloat(rate.conversion_rate.toString()));
    }
  } catch (dbError) {
    console.warn('[CURRENCY] Failed to batch-fetch rates from DB:', dbError);
  }

  // Step 2: For missing dates, find the nearest preceding rate in DB
  const missingDates = dates.filter(d => !rateMap.has(d));

  for (const dateStr of missingDates) {
    try {
      const nearestRate = await prisma.currency_conversion.findFirst({
        where: {
          date: { lte: new Date(dateStr + 'T23:59:59.999Z') },
        },
        orderBy: { date: 'desc' },
      });

      if (nearestRate) {
        rateMap.set(dateStr, parseFloat(nearestRate.conversion_rate.toString()));
      } else {
        // No rate at all in DB before this date, try the earliest available
        const earliestRate = await prisma.currency_conversion.findFirst({
          orderBy: { date: 'asc' },
        });
        if (earliestRate) {
          rateMap.set(dateStr, parseFloat(earliestRate.conversion_rate.toString()));
        } else {
          // No rates in DB at all, use default
          console.warn(`[CURRENCY] No rate found for ${dateStr}, using default 1.0`);
          rateMap.set(dateStr, 1.0);
        }
      }
    } catch (dbError) {
      console.warn(`[CURRENCY] Failed to find nearest rate for ${dateStr}:`, dbError);
      rateMap.set(dateStr, 1.0);
    }
  }

  return rateMap;
}
