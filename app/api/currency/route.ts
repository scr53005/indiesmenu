// app/api/currency/route.ts
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import prisma from '@/lib/prisma';

// Interface for the return type
interface CurrencyRate {
  date: string; // ISO string for JSON serialization
  conversion_rate: number;
  isFresh: boolean;
}

// GET handler for fetching the latest EUR/USD rate
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const todayStr = searchParams.get('today') || new Date().toISOString().split('T')[0]; // Use current date if no param
  const today = new Date(todayStr);

  if (isNaN(today.getTime())) {
    console.warn('Invalid today parameter, using current date:', todayStr);
    today.setTime(new Date().getTime()); // Fallback to current date
  }

  // Step 1: Fetch the latest row from currency_conversion, ordered by date descending
  let latestRate;
  try {
    latestRate = await prisma.currency_conversion.findFirst({
      orderBy: { date: 'desc' },
    });
  } catch (dbError) {
    console.warn('Failed to fetch latest rate from DB:', dbError);
    latestRate = null;
  }

  // Step 2: Check if the latest row is for today
  if (latestRate && latestRate.date.toISOString().split('T')[0] === todayStr) {
    return NextResponse.json({
      date: latestRate.date.toISOString(),
      conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
      isFresh: false,
    });
  }

  // Step 3: Try to fetch rate from ECB's daily XML feed
  try {
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    if (!response.ok) {
      console.warn('Failed to fetch ECB rates, status:', response.status);
      // Fallback to latest DB rate if available
      if (latestRate) {
        return NextResponse.json({
          date: latestRate.date.toISOString(),
          conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
          isFresh: false,
        });
      }
      // Both ECB and DB failed
      console.warn('No rate in DB, using default rate of 1.0');
      return NextResponse.json({
        date: today.toISOString(),
        conversion_rate: 1.0,
        isFresh: false,
      });
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
        return NextResponse.json({
          date: existingEcbRate.date.toISOString(),
          conversion_rate: parseFloat(existingEcbRate.conversion_rate.toString()),
          isFresh: false,
        });
      }
    } catch (dbError) {
      console.warn('Failed to check for existing ECB date in DB:', dbError);
      // Proceed to save the rate, but be cautious of potential duplicates
    }

    // Step 5: Determine freshness (ECB date is today or not)
    const isFresh = ecbDate.toISOString().split('T')[0] === todayStr;

    // Step 5: Save the new rate to the database
    try {
      await prisma.currency_conversion.create({
        data: {
          date: ecbDate,
          conversion_rate: rate,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        console.warn('ECB rate for date already exists in DB:', ecbDate.toISOString().split('T')[0]);
      } else {
        console.warn('Failed to save ECB rate to database:', dbError);
      }
      // Continue with the ECB rate even if DB save fails
    }


    return NextResponse.json({
      date: ecbDate.toISOString(),
      conversion_rate: rate,
      isFresh,
    });
  } catch (ecbError) {
    console.warn('Failed to fetch or parse ECB rate:', ecbError);
    // Fallback to latest DB rate if available
    if (latestRate) {
      return NextResponse.json({
        date: latestRate.date.toISOString(),
        conversion_rate: parseFloat(latestRate.conversion_rate.toString()),
        isFresh: false,
      });
    }
    // Both ECB and DB failed
    console.warn('No rate in DB, using default rate of 1.0');
    return NextResponse.json({
      date: today.toISOString(),
      conversion_rate: 1.0,
      isFresh: false,
    });
  }
}