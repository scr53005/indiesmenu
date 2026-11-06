// Account import helpers (R3). Pure, unit-tested; hooks/useImportAccount.ts uses them.
// Relative imports only: tested file (CLAUDE.md alias gotcha).

/** Lookups left before the import is disabled on this phone. */
export const ATTEMPTS_KEY = 'innopay_import_attempts';

/** Trimmed, lower-cased email, or null when it doesn't look like one. */
export function normalizeImportEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Stored attempts left, or null when unknown (never set, unreadable, or not a number). */
export function readImportAttempts(storage: Pick<Storage, 'getItem'>): number | null {
  try {
    const raw = storage.getItem(ATTEMPTS_KEY);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
