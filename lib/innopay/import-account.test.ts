import { describe, expect, it } from 'vitest';
import { normalizeImportEmail, readImportAttempts } from './import-account';

describe('normalizeImportEmail', () => {
  it('trims and lower-cases a valid email', () => {
    expect(normalizeImportEmail('  Alice@Example.LU ')).toBe('alice@example.lu');
  });
  it('rejects things that are not an email', () => {
    for (const bad of ['', 'alice', 'alice@', 'alice@example', 'a b@c.lu', '@c.lu']) {
      expect(normalizeImportEmail(bad), bad).toBeNull();
    }
  });
});

describe('readImportAttempts', () => {
  const store = (v: string | null) => ({ getItem: () => v });
  it('reads a stored count, including 0', () => {
    expect(readImportAttempts(store('3'))).toBe(3);
    expect(readImportAttempts(store('0'))).toBe(0);
  });
  it('is null when unknown or unreadable', () => {
    expect(readImportAttempts(store(null))).toBeNull();
    expect(readImportAttempts(store('abc'))).toBeNull();
    expect(readImportAttempts({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  });
});
