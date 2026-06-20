/**
 * lib/innopay/keystore.ts — Phase 1 (Option A: at-rest WebCrypto encryption)
 *
 * Single choke point for innopay customer key material in the browser. Per
 * SPOKE-KEY-SECURITY.md, a spoke persists ONLY the `active` and `memo` private
 * keys (never the master password — the owner-deriving @millewee-hack vector —
 * nor the posting key, which never signs). Phase 0 stored them in the clear;
 * Phase 1 wraps them at rest with a NON-EXTRACTABLE AES-GCM key whose handle
 * lives in IndexedDB and whose bytes never enter JS. A raw localStorage/disk dump
 * then yields only ciphertext (defeats T1, the at-rest infostealer threat).
 *
 * Integration = "unlock-into-memory" (SPOKE-KEY-SECURITY.md §9): a single async
 * `unlock()` at mount decrypts active+memo into module-scope vars; the getters
 * stay SYNCHRONOUS so the order/call-waiter call sites are unchanged. The decrypt
 * is async only at that one spot.
 *
 * Wallet blob (§9.8): indiesmenu is the only spoke that uses the display blob,
 * and it is trimmed to `{ username }` here — the old `activeKey` field was never
 * read (signing uses getActiveKey()) and storing it plaintext would undermine the
 * at-rest encryption.
 *
 * Capability fallback: if WebCrypto/IndexedDB aren't available or we're not in a
 * secure context (old WebView, http staging, Safari private-mode IDB quirks), we
 * transparently store PLAINTEXT as in Phase 0 (degraded at-rest security, not
 * broken function) — UX is king for these low-value wallets.
 *
 * Must use relative imports only (it has none) and stay free of the `@/` alias so
 * it remains importable from vitest / tsx (see CLAUDE.md alias gotcha).
 */

/** localStorage keys the spoke is allowed to persist. */
export const KEYS = {
  accountName: 'innopay_accountName',
  active: 'innopay_activePrivate',
  memo: 'innopay_memoPrivate',
  /** Non-sensitive display blob: { username } only (§9.8 — no activeKey). */
  blob: 'innopay_wallet_credentials',
} as const;

/**
 * Keys older builds wrote that must NEVER be persisted again and must be purged
 * from existing browsers. `masterPassword` derives the owner key; `postingPrivate`
 * is dead storage (never consulted when signing).
 */
export const FORBIDDEN_KEYS = ['innopay_masterPassword', 'innopay_postingPrivate'] as const;

/** The trimmed wallet blob shape — display username only. */
export interface WalletBlob {
  username: string;
}

export interface SpokeKeyInput {
  accountName?: string | null;
  activeKey?: string | null;
  memoKey?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Envelope format (pure — exported for testing)
// ─────────────────────────────────────────────────────────────────────────────

/** Ciphertext envelope: `enc:v1:<iv_b64>:<ct_b64>`. Base64 never contains ':'. */
const ENVELOPE_PREFIX = 'enc:v1:';

/** True if a stored value is an encrypted envelope (vs legacy plaintext). */
export function isCiphertextEnvelope(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENVELOPE_PREFIX);
}

/** exported for testing */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * exported for testing. Return type is pinned to `Uint8Array<ArrayBuffer>` (not
 * the default `ArrayBufferLike`, which admits SharedArrayBuffer) so the result is
 * assignable to WebCrypto's `BufferSource` under TS 5.7+ typed-array generics.
 */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store + module state
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the localStorage-like store, or null when unavailable (SSR / disabled). */
function store(): Storage | null {
  try {
    const s = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

// In-memory cache of the DECRYPTED keys (the "unlock-into-memory" cache). Sync
// getters read these. Kept coherent with storage by saveKeys/clearCredentials.
let cachedActiveKey: string | null = null;
let cachedMemoKey: string | null = null;
let vaultKey: CryptoKey | null = null;
let cryptoMode: 'encrypted' | 'plaintext' = 'plaintext';
let readyPromise: Promise<void> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Capability detection + IndexedDB vault key
// ─────────────────────────────────────────────────────────────────────────────

function cryptoCapable(): boolean {
  try {
    const g = globalThis as unknown as {
      isSecureContext?: boolean;
      crypto?: Crypto;
      indexedDB?: unknown;
    };
    return (
      g.isSecureContext === true &&
      !!g.crypto?.subtle &&
      g.indexedDB !== undefined &&
      g.indexedDB !== null
    );
  } catch {
    return false;
  }
}

const IDB_NAME = 'innopay_keystore';
const IDB_STORE = 'vault';
const VAULT_KEY_ID = 'aesgcm-v1';

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Read the non-extractable vault key from IDB, generating + persisting it once. */
async function getOrCreateVaultKey(): Promise<CryptoKey> {
  const db = await openVaultDb();
  try {
    const existing = await idbGet<CryptoKey>(db, VAULT_KEY_ID);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      /* extractable */ false,
      ['encrypt', 'decrypt'],
    );
    await idbPut(db, VAULT_KEY_ID, key);
    return key;
  } finally {
    db.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Encrypt / decrypt (key-param pure functions — exported for testing)
// ─────────────────────────────────────────────────────────────────────────────

/** exported for testing — AES-GCM encrypt to an `enc:v1:<iv>:<ct>` envelope. */
export async function encryptValue(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${ENVELOPE_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ct))}`;
}

/** exported for testing — decrypt an `enc:v1:<iv>:<ct>` envelope. Throws on failure. */
export async function decryptValue(key: CryptoKey, envelope: string): Promise<string> {
  if (!isCiphertextEnvelope(envelope)) throw new Error('keystore: not a ciphertext envelope');
  const body = envelope.slice(ENVELOPE_PREFIX.length); // '<iv_b64>:<ct_b64>'
  const sep = body.indexOf(':');
  if (sep < 0) throw new Error('keystore: malformed envelope');
  const iv = base64ToBytes(body.slice(0, sep));
  const ct = base64ToBytes(body.slice(sep + 1));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

async function encryptForStore(plaintext: string): Promise<string> {
  if (cryptoMode === 'encrypted' && vaultKey) return encryptValue(vaultKey, plaintext);
  return plaintext; // plaintext-fallback mode
}

// ─────────────────────────────────────────────────────────────────────────────
// unlock / ensureReady — the single async surface (called once at mount)
// ─────────────────────────────────────────────────────────────────────────────

/** Decrypt a stored slot into the cache, migrating legacy plaintext in place. */
async function unwrapOrMigrate(
  s: Storage,
  storageKey: string,
  onMigrated: () => void,
): Promise<string | null> {
  const raw = s.getItem(storageKey);
  if (!raw) return null;
  if (isCiphertextEnvelope(raw)) return decryptValue(vaultKey!, raw);
  // Legacy plaintext (pre-Phase-1) → encrypt in place, keep the value cached.
  s.setItem(storageKey, await encryptValue(vaultKey!, raw));
  onMigrated();
  return raw;
}

async function unlock(): Promise<void> {
  const s = store();
  if (!s) {
    cryptoMode = 'plaintext';
    return;
  }

  if (!cryptoCapable()) {
    // No WebCrypto/IDB/secure-context → behave like Phase 0 (plaintext at rest).
    // If a prior (capable) session left ciphertext we can't read it now → treat as
    // absent (getActiveKey null → eviction/Flow 8 re-import), don't cache the envelope.
    cryptoMode = 'plaintext';
    const rawActive = s.getItem(KEYS.active);
    const rawMemo = s.getItem(KEYS.memo);
    cachedActiveKey = isCiphertextEnvelope(rawActive) ? null : rawActive;
    cachedMemoKey = isCiphertextEnvelope(rawMemo) ? null : rawMemo;
    console.warn(
      '[keystore] WebCrypto/IndexedDB unavailable or insecure context — at-rest keys stored in PLAINTEXT (degraded). Capability:',
      {
        secureContext: (globalThis as { isSecureContext?: boolean }).isSecureContext,
        subtle: !!globalThis.crypto?.subtle,
        indexedDB: (globalThis as { indexedDB?: unknown }).indexedDB !== undefined,
      },
    );
    return;
  }

  try {
    vaultKey = await getOrCreateVaultKey();
    cryptoMode = 'encrypted';
    let migrated = 0;
    const onMigrated = () => {
      migrated++;
    };
    cachedActiveKey = await unwrapOrMigrate(s, KEYS.active, onMigrated);
    cachedMemoKey = await unwrapOrMigrate(s, KEYS.memo, onMigrated);
    console.log('[keystore] unlock ok', { migrated, encrypted: true });
  } catch (err) {
    // Vault key evicted (Safari ITP) or corrupt ciphertext → leave keys absent.
    // getActiveKey() returns null → existing eviction path (innopay-authority
    // fallback + background Flow 8 re-import).
    console.error('[keystore] unlock failed', err);
    cachedActiveKey = null;
    cachedMemoKey = null;
  }
}

/**
 * Idempotent, memoised unlock. Kick it off at app mount (alongside
 * purgeForbidden); the sync getters read the cache it fills.
 */
export function ensureReady(): Promise<void> {
  if (!readyPromise) readyPromise = unlock();
  return readyPromise;
}

/** exported for testing — reset all module state between cases. */
export function __resetForTest(): void {
  cachedActiveKey = null;
  cachedMemoKey = null;
  vaultKey = null;
  cryptoMode = 'plaintext';
  readyPromise = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (getters sync; saveKeys async)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist credential material. Encrypts active/memo at rest (or stores plaintext
 * in fallback mode) AND updates the in-memory cache in the same call — the latter
 * is the one cache-coherence invariant that matters (Flow 8 re-import after
 * eviction must leave the cache fresh; SPOKE-KEY-SECURITY.md §9.7).
 */
export async function saveKeys(input: SpokeKeyInput): Promise<void> {
  const s = store();
  if (!s) return;
  await ensureReady();
  if (input.accountName) s.setItem(KEYS.accountName, input.accountName);
  if (input.activeKey) {
    cachedActiveKey = input.activeKey;
    s.setItem(KEYS.active, await encryptForStore(input.activeKey));
  }
  if (input.memoKey) {
    cachedMemoKey = input.memoKey;
    s.setItem(KEYS.memo, await encryptForStore(input.memoKey));
  }
  purgeForbidden();
}

/** Account name is not a secret — stored plaintext, read synchronously (no unlock needed). */
export function getAccountName(): string | null {
  return store()?.getItem(KEYS.accountName) ?? null;
}

/** Decrypted active key from the in-memory cache (null before unlock / on decrypt failure). */
export function getActiveKey(): string | null {
  return cachedActiveKey;
}

/** Decrypted memo key from the in-memory cache. */
export function getMemoKey(): string | null {
  return cachedMemoKey;
}

/**
 * True when the browser holds a wallet — account name + a stored active-key slot.
 * Presence-based (reads storage, not the cache) so it's correct before unlock
 * resolves and regardless of crypto mode.
 */
export function hasWallet(): boolean {
  const s = store();
  return !!getAccountName() && !!s?.getItem(KEYS.active);
}

/** Persist only the non-sensitive display username (§9.8 — no activeKey in the blob). */
export function saveWalletBlob(blob: WalletBlob): void {
  const s = store();
  if (!s) return;
  s.setItem(KEYS.blob, JSON.stringify({ username: blob.username }));
}

/** Read the wallet blob, returning only the username (defensive against legacy blobs). */
export function loadWalletBlob(): WalletBlob | null {
  const s = store();
  if (!s) return null;
  const raw = s.getItem(KEYS.blob);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WalletBlob>;
    if (!parsed || typeof parsed.username !== 'string') return null;
    return { username: parsed.username };
  } catch {
    return null;
  }
}

/**
 * One-time, idempotent migration. Removes the forbidden legacy keys and strips
 * masterPassword / postingKey / activeKey from the wallet blob if an older build
 * embedded them (§9.8). Safe to call on every app mount.
 */
export function purgeForbidden(): void {
  const s = store();
  if (!s) return;
  for (const k of FORBIDDEN_KEYS) s.removeItem(k);

  const raw = s.getItem(KEYS.blob);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed &&
      ('masterPassword' in parsed || 'postingKey' in parsed || 'activeKey' in parsed)
    ) {
      s.setItem(KEYS.blob, JSON.stringify({ username: String(parsed.username ?? '') }));
    }
  } catch {
    // Leave a malformed blob untouched; loadWalletBlob() will reject it anyway.
  }
}

/**
 * Remove ALL innopay credential material (account name, active, memo, blob) plus
 * any forbidden leftovers, and clear the in-memory cache (so a stale decrypted
 * key can't survive logout/dev-clear).
 */
export function clearCredentials(): void {
  cachedActiveKey = null;
  cachedMemoKey = null;
  const s = store();
  if (!s) return;
  s.removeItem(KEYS.accountName);
  s.removeItem(KEYS.active);
  s.removeItem(KEYS.memo);
  s.removeItem(KEYS.blob);
  for (const k of FORBIDDEN_KEYS) s.removeItem(k);
}
