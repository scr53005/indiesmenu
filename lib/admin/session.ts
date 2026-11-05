// Signed admin session cookie (2026-11-05). Before, the cookie held the fixed text
// "authenticated", so anyone could set it by hand and use every /admin page and /api/admin
// route without the password. Now the cookie is `<expiry>.<HMAC-SHA256(expiry)>`, keyed with
// ADMIN_PASSWORD: it can't be forged without the password, it expires on its own, and changing
// the password logs every session out.
//
// Web Crypto only (no node:crypto) so the same file runs in middleware/proxy (edge runtime on
// Next 15) and in route handlers. Relative imports only: tested file (CLAUDE.md alias gotcha).

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 h, as before

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
}

/** Compares without stopping at the first difference, so timing doesn't leak the match length. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The configured admin password, or null when unset: no default password, ever. */
export function adminSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.ADMIN_PASSWORD;
  return secret && secret.length > 0 ? secret : null;
}

export async function createAdminSession(secret: string, nowMs: number = Date.now()): Promise<string> {
  const expiry = Math.floor(nowMs / 1000) + ADMIN_SESSION_TTL_SECONDS;
  return `${expiry}.${await hmacHex(secret, `admin-session:v1:${expiry}`)}`;
}

export async function verifyAdminSession(
  token: string | undefined, secret: string | null, nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const match = /^(\d{1,12})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry * 1000 <= nowMs) return false;
  return constantTimeEqual(match[2], await hmacHex(secret, `admin-session:v1:${expiry}`));
}
