/**
 * EURO and RUBIS from one Hive-Engine `balances` answer (RUBIS-PLAN.md §5).
 *
 * `euro` is null when the answer has no EURO row: /api/balance/euro then keeps its historic behaviour
 * (try the next node, then the HBD conversion). A missing RUBIS row is a genuine 0: the account never
 * held any. Exported for testing.
 */
export function parseTokenBalances(rows: unknown): { euro: number | null; rubis: number } {
  const list = Array.isArray(rows) ? rows : [];
  const amount = (symbol: string): number | null => {
    const row = list.find((r: { symbol?: unknown }) => r?.symbol === symbol) as { balance?: unknown } | undefined;
    if (!row) return null;
    const value = parseFloat(String(row.balance));
    return Number.isFinite(value) ? value : null;
  };
  return { euro: amount('EURO'), rubis: amount('RUBIS') ?? 0 };
}
