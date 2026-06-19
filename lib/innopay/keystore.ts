/**
 * lib/innopay/keystore.ts
 *
 * Single choke point for reading/writing innopay customer key material in the
 * browser. Per SPOKE-KEY-SECURITY.md (Roadmap Priority 1), a spoke must persist
 * ONLY the `active` and `memo` private keys:
 *   - the master password is the owner-deriving secret (the @millewee-hack
 *     vector) and must NEVER be stored;
 *   - the posting key is never used to sign in a spoke and must not be stored.
 * Both are purged on load (`purgeForbidden`) so they don't linger in the
 * browsers of customers who ordered before this refactor.
 *
 * Why a module: credential localStorage access used to be scattered as raw
 * `localStorage.setItem/getItem` calls across app/menu/page.tsx. Centralising it
 * (a) makes the "only active + memo" invariant enforceable in one place, and
 * (b) lets Phase 1 (Option A — a non-extractable WebCrypto wrap) drop in behind
 * this interface with no call-site changes.
 *
 * Must use relative imports only (it has none) and stay free of the `@/` alias so
 * it remains importable from vitest / tsx (see CLAUDE.md alias gotcha). All access
 * goes through `globalThis.localStorage`, which is the browser store at runtime
 * and jsdom's store under tests; SSR (no store) degrades to safe no-ops.
 */

/** localStorage keys the spoke is allowed to persist. */
export const KEYS = {
  accountName: 'innopay_accountName',
  active: 'innopay_activePrivate',
  memo: 'innopay_memoPrivate',
  /** Non-sensitive display blob: { username, activeKey } only. */
  blob: 'innopay_wallet_credentials',
} as const;

/**
 * Keys older builds wrote that must NEVER be persisted again and must be purged
 * from existing browsers. `masterPassword` derives the owner key; `postingPrivate`
 * is dead storage (never consulted when signing).
 */
export const FORBIDDEN_KEYS = ['innopay_masterPassword', 'innopay_postingPrivate'] as const;

/** The trimmed wallet blob shape — never contains master password or posting key. */
export interface WalletBlob {
  username: string;
  activeKey: string;
}

export interface SpokeKeyInput {
  accountName?: string | null;
  activeKey?: string | null;
  memoKey?: string | null;
}

/** Returns the localStorage-like store, or null when unavailable (SSR / disabled). */
function store(): Storage | null {
  try {
    const s = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    return s ?? null;
  } catch {
    // Accessing localStorage can throw (e.g. sandboxed iframe, blocked cookies).
    return null;
  }
}

/**
 * Persist credential material. Only `accountName`, `activeKey`, and `memoKey` are
 * ever written; any forbidden leftovers are purged in the same pass so a re-save
 * can never resurrect them.
 */
export function saveKeys(input: SpokeKeyInput): void {
  const s = store();
  if (!s) return;
  if (input.accountName) s.setItem(KEYS.accountName, input.accountName);
  if (input.activeKey) s.setItem(KEYS.active, input.activeKey);
  if (input.memoKey) s.setItem(KEYS.memo, input.memoKey);
  purgeForbidden();
}

export function getAccountName(): string | null {
  return store()?.getItem(KEYS.accountName) ?? null;
}

export function getActiveKey(): string | null {
  return store()?.getItem(KEYS.active) ?? null;
}

export function getMemoKey(): string | null {
  return store()?.getItem(KEYS.memo) ?? null;
}

/**
 * True when the browser holds a LOCALLY USABLE wallet — both the account name and
 * the active key. Requiring the active key is deliberate: browser eviction is
 * origin-atomic (it never deletes one key while sparing another), so "active key
 * missing" effectively means "evicted" → the right response is to route the user
 * to the one-time Flow 8 re-import, not to keep ordering. A degenerate
 * account-only state (e.g. a hub response with no active key) heals the same way.
 *
 * The "UX is king" innopay-authority fallback still applies, but at the layer
 * where it belongs: the hub's sign-and-broadcast cascade transparently falls back
 * to innopay authority if the active key we send is present-but-insufficient, so
 * a legitimate order never hard-fails (see SPOKE-KEY-SECURITY.md §4).
 */
export function hasWallet(): boolean {
  return !!getAccountName() && !!getActiveKey();
}

/** Persist only the non-sensitive display fields of the wallet blob. */
export function saveWalletBlob(blob: WalletBlob): void {
  const s = store();
  if (!s) return;
  const trimmed: WalletBlob = { username: blob.username, activeKey: blob.activeKey };
  s.setItem(KEYS.blob, JSON.stringify(trimmed));
}

/** Read the wallet blob, returning only the trimmed fields (defensive against legacy blobs). */
export function loadWalletBlob(): WalletBlob | null {
  const s = store();
  if (!s) return null;
  const raw = s.getItem(KEYS.blob);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WalletBlob>;
    if (!parsed || typeof parsed.username !== 'string') return null;
    return { username: parsed.username, activeKey: parsed.activeKey ?? '' };
  } catch {
    return null;
  }
}

/**
 * One-time, idempotent migration. Removes the forbidden legacy keys and strips
 * masterPassword / postingKey from the wallet blob if an older build embedded
 * them. Safe to call on every app mount.
 */
export function purgeForbidden(): void {
  const s = store();
  if (!s) return;
  for (const k of FORBIDDEN_KEYS) s.removeItem(k);

  const raw = s.getItem(KEYS.blob);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && (('masterPassword' in parsed) || ('postingKey' in parsed))) {
      const trimmed: WalletBlob = {
        username: String(parsed.username ?? ''),
        activeKey: String(parsed.activeKey ?? ''),
      };
      s.setItem(KEYS.blob, JSON.stringify(trimmed));
    }
  } catch {
    // Leave a malformed blob untouched; loadWalletBlob() will reject it anyway.
  }
}

/**
 * Remove ALL innopay credential material (account name, active, memo, blob) plus
 * any forbidden leftovers. Used by dev "Clear LS" and by wallet disconnect.
 */
export function clearCredentials(): void {
  const s = store();
  if (!s) return;
  s.removeItem(KEYS.accountName);
  s.removeItem(KEYS.active);
  s.removeItem(KEYS.memo);
  s.removeItem(KEYS.blob);
  for (const k of FORBIDDEN_KEYS) s.removeItem(k);
}
