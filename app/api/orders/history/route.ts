import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const daysToFetch = parseInt(searchParams.get('days') || '3');

    // Get all fulfilled orders grouped by date, ordered by most recent first
    // Use raw SQL to efficiently get distinct dates with fulfilled orders
    const datesWithOrders: { date: Date }[] = await prisma.$queryRaw`
      SELECT DISTINCT DATE(fulfilled_at AT TIME ZONE 'Europe/Paris') as date
      FROM transfers
      WHERE fulfilled = true
      AND fulfilled_at IS NOT NULL
      ORDER BY date DESC
      LIMIT ${daysToFetch}
      OFFSET ${skip}
    `;

    if (datesWithOrders.length === 0) {
      // Check if there are ANY fulfilled orders at all
      const anyFulfilled = await prisma.transfers.findFirst({
        where: { fulfilled: true },
      });

      return NextResponse.json({
        orders: [],
        hasMore: false,
        totalDaysWithOrders: anyFulfilled ? -1 : 0 // -1 means there are orders but not in this range
      });
    }

    // Get the earliest and latest dates from our batch
    const latestDate = new Date(datesWithOrders[0].date);
    const earliestDate = new Date(datesWithOrders[datesWithOrders.length - 1].date);

    // Set time boundaries for the date range (start of earliest day to end of latest day in Paris timezone)
    const startOfEarliestDay = new Date(earliestDate);
    startOfEarliestDay.setHours(0, 0, 0, 0);

    const endOfLatestDay = new Date(latestDate);
    endOfLatestDay.setHours(23, 59, 59, 999);

    // Fetch all fulfilled orders within this date range
    const fulfilledOrders = await prisma.transfers.findMany({
      where: {
        fulfilled: true,
        fulfilled_at: {
          gte: startOfEarliestDay,
          lte: endOfLatestDay,
        },
      },
      select: {
        id: true,
        from_account: true,
        amount: true,
        symbol: true,
        memo: true,
        parsed_memo: true,
        fulfilled_at: true,
      },
      orderBy: { fulfilled_at: 'desc' },
    });

    // Check if there are more days with orders beyond this batch
    const moreDates: { date: Date }[] = await prisma.$queryRaw`
      SELECT DISTINCT DATE(fulfilled_at AT TIME ZONE 'Europe/Paris') as date
      FROM transfers
      WHERE fulfilled = true
      AND fulfilled_at IS NOT NULL
      AND DATE(fulfilled_at AT TIME ZONE 'Europe/Paris') < ${earliestDate}
      LIMIT 1
    `;

    const hasMore = moreDates.length > 0;

    // Format the response
    const formattedOrders = fulfilledOrders.map(order => ({
      id: order.id.toString(),
      from_account: order.from_account,
      amount: order.amount,
      symbol: order.symbol,
      memo: order.memo,
      parsed_memo: order.parsed_memo,
      fulfilled_at: order.fulfilled_at ? order.fulfilled_at.toISOString() : null,
    }));

    return NextResponse.json({
      orders: formattedOrders,
      hasMore,
      daysReturned: datesWithOrders.length
    });
  } catch (error: any) {
    console.error('Order history fetch error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch order history: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}