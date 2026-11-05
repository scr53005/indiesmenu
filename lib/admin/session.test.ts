import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_TTL_SECONDS, adminSecret, constantTimeEqual, createAdminSession, verifyAdminSession,
} from './session';

const SECRET = 'correct horse battery staple';
const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);

describe('admin session cookie', () => {
  it('accepts a session it issued, until it expires', async () => {
    const token = await createAdminSession(SECRET, NOW);
    expect(await verifyAdminSession(token, SECRET, NOW)).toBe(true);
    expect(await verifyAdminSession(token, SECRET, NOW + (ADMIN_SESSION_TTL_SECONDS - 1) * 1000)).toBe(true);
    expect(await verifyAdminSession(token, SECRET, NOW + ADMIN_SESSION_TTL_SECONDS * 1000)).toBe(false);
  });

  // Regression: the old cookie was the fixed text "authenticated", settable by anyone.
  it('rejects the old fixed cookie value and other hand-made values', async () => {
    expect(await verifyAdminSession('authenticated', SECRET, NOW)).toBe(false);
    expect(await verifyAdminSession('', SECRET, NOW)).toBe(false);
    expect(await verifyAdminSession(undefined, SECRET, NOW)).toBe(false);
    expect(await verifyAdminSession(`9999999999.${'0'.repeat(64)}`, SECRET, NOW)).toBe(false);
  });

  it('rejects a session whose expiry was pushed back', async () => {
    const [expiry, sig] = (await createAdminSession(SECRET, NOW)).split('.');
    expect(await verifyAdminSession(`${Number(expiry) + 86400}.${sig}`, SECRET, NOW)).toBe(false);
  });

  it('logs everyone out when the password changes', async () => {
    const token = await createAdminSession(SECRET, NOW);
    expect(await verifyAdminSession(token, 'new password', NOW)).toBe(false);
  });

  it('never accepts anything when no password is configured', async () => {
    const token = await createAdminSession(SECRET, NOW);
    expect(await verifyAdminSession(token, null, NOW)).toBe(false);
  });
});

describe('adminSecret', () => {
  it('has no default password', () => {
    expect(adminSecret({})).toBeNull();
    expect(adminSecret({ ADMIN_PASSWORD: '' })).toBeNull();
    expect(adminSecret({ ADMIN_PASSWORD: 'x' })).toBe('x');
  });
});

describe('constantTimeEqual', () => {
  it('compares strings exactly', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
