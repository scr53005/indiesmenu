import { NextRequest, NextResponse } from 'next/server';
import { fetchCurrencyRate } from '@/lib/currency-service';

/**
 * GET /api/balance/euro?account=<accountName>
 * Fetches EURO token balance with robust fallback mechanism
 *
 * Strategy:
 * 1. Try multiple Hive-Engine endpoints with 2-second timeout each
 * 2. Fallback to HBD balance from Hive blockchain (converted to EUR)
 * 3. Return error only if all APIs fail
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountName = searchParams.get('account');

  if (!accountName) {
    return NextResponse.json(
      { error: 'Missing account parameter' },
      { status: 400 }
    );
  }

  console.log('[BALANCE API] Fetching EURO balance for:', accountName);

  // Step 1: Try to fetch real balance from Hive-Engine (multiple endpoints with timeout)
  const hiveEngineEndpoints = [
    'https://api.hive-engine.com/rpc/contracts',
    'https://engine.rishipanthee.com/contracts',
    'https://herpc.dtools.dev/contracts'
  ];

  for (const endpoint of hiveEngineEndpoints) {
    try {
      console.log('[BALANCE API] Trying Hive-Engine endpoint:', endpoint);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5 seconds for better reliability

      const balanceResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'find',
          params: {
            contract: 'tokens',
            table: 'balances',
            query: {
              account: accountName,
              symbol: 'EURO'
            }
          },
          id: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[BALANCE API] Response status:', balanceResponse.status, balanceResponse.statusText);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log('[BALANCE API] Response data:', JSON.stringify(balanceData).substring(0, 200));

        if (balanceData.result && balanceData.result.length > 0) {
          const euroBalance = parseFloat(balanceData.result[0].balance);
          console.log('[BALANCE API] ✓ Real EURO balance from Hive-Engine:', euroBalance);

          return NextResponse.json({
            balance: euroBalance,
            source: 'hive-engine',
            endpoint
          });
        } else {
          console.warn('[BALANCE API] Empty or missing result from endpoint:', endpoint);
          // Continue to next endpoint
        }
      } else {
        console.warn('[BALANCE API] Non-OK response:', balanceResponse.status, balanceResponse.statusText);
        // Continue to next endpoint
      }
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        name: error.name,
        cause: error.cause,
        stack: error.stack?.split('\n')[0] // Just first line of stack
      };
      console.warn('[BALANCE API] Hive-Engine endpoint failed:', endpoint, JSON.stringify(errorDetails));
      // Continue to next endpoint
    }
  }

  // Step 2: If all Hive-Engine endpoints failed, try HBD balance from Hive as fallback
  console.log('[BALANCE API] All Hive-Engine endpoints failed, trying HBD balance from Hive');

  try {
    // Fetch EUR/USD rate first using shared currency service
    const today = new Date();
    const rateData = await fetchCurrencyRate(today);
    const eurUsdRate = rateData.conversion_rate;
    console.log('[BALANCE API] EUR/USD rate for fallback:', eurUsdRate);

    // Fetch HBD balance from Hive
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5 seconds

    console.log('[BALANCE API] Fetching HBD balance from api.hive.blog...');

    const hiveResponse = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[accountName]],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[BALANCE API] Hive API response status:', hiveResponse.status, hiveResponse.statusText);

    if (hiveResponse.ok) {
      const hiveData = await hiveResponse.json();
      if (hiveData.result && hiveData.result.length > 0) {
        const hbdBalanceStr = hiveData.result[0].hbd_balance;
        const hbdBalance = parseFloat(hbdBalanceStr.split(' ')[0]);
        const calculatedEuroBalance = hbdBalance / eurUsdRate;

        console.log('[BALANCE API] ✓ HBD balance:', hbdBalance, 'Calculated EURO:', calculatedEuroBalance);

        return NextResponse.json({
          balance: calculatedEuroBalance,
          source: 'hive-hbd-conversion',
          hbdBalance,
          eurUsdRate
        });
      } else {
        console.warn('[BALANCE API] Empty result from Hive API');
      }
    } else {
      console.warn('[BALANCE API] Hive API non-OK response:', hiveResponse.status);
    }
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      name: error.name,
      cause: error.cause
    };
    console.error('[BALANCE API] Hive HBD fallback also failed:', JSON.stringify(errorDetails));
  }

  // Step 3: All APIs failed
  return NextResponse.json(
    { error: 'Unable to fetch balance from any API endpoint' },
    { status: 503 }
  );
}
