import { describe, it, expect, beforeAll, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { encryptValue, decryptValue, isCiphertextEnvelope } from './keystore';

// jsdom's global `crypto` may lack SubtleCrypto. encryptValue/decryptValue call
// the GLOBAL `crypto`, so stub it with Node's WebCrypto (always has subtle +
// getRandomValues). No IndexedDB here — we pass the vault key directly; the IDB
// vault-key lifecycle + unlock() migration are validated by the browser smoke
// test (SPOKE-KEY-SECURITY.md §9.9).
beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto);
});

const genKey = () =>
  (globalThis.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  ) as Promise<CryptoKey>);

describe('WebCrypto envelope round-trip', () => {
  it('encrypts to an enc:v1: envelope and decrypts back to the original WIF', async () => {
    const key = await genKey();
    const wif = '5JphiHDeadbeefExampleActiveKeyWIFstring1234567890';
    const env = await encryptValue(key, wif);

    expect(isCiphertextEnvelope(env)).toBe(true);
    expect(env.startsWith('enc:v1:')).toBe(true);
    expect(env).not.toContain(wif); // ciphertext must not leak the plaintext
    expect(await decryptValue(key, env)).toBe(wif);
  });

  it('uses a fresh IV each time (same plaintext → different ciphertext, both decrypt)', async () => {
    const key = await genKey();
    const a = await encryptValue(key, 'SAME');
    const b = await encryptValue(key, 'SAME');
    expect(a).not.toBe(b);
    expect(await decryptValue(key, a)).toBe('SAME');
    expect(await decryptValue(key, b)).toBe('SAME');
  });

  it('round-trips unicode / memo-style content', async () => {
    const key = await genKey();
    const memo = 'memo-é-ü-Dëschnummer-🔐';
    expect(await decryptValue(key, await encryptValue(key, memo))).toBe(memo);
  });

  it('rejects decryption with the wrong key (the eviction/regeneration case)', async () => {
    const k1 = await genKey();
    const k2 = await genKey();
    const env = await encryptValue(k1, 'SECRET');
    await expect(decryptValue(k2, env)).rejects.toThrow();
  });

  it('rejects a non-envelope / malformed value', async () => {
    const key = await genKey();
    await expect(decryptValue(key, 'plaintext-wif')).rejects.toThrow();
    await expect(decryptValue(key, 'enc:v1:onlyonepart')).rejects.toThrow();
  });
});
