import { describe, expect, it } from 'vitest';
import { newOpenOrderCheck, readSoundOn, writeSoundOn } from './co-sound';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};
const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

describe('CO bell preference', () => {
  it('survives a page load (regression: it reset to off on every reload)', () => {
    const s = memoryStorage();
    expect(readSoundOn(s)).toBe(false);
    writeSoundOn(s, true);
    expect(readSoundOn(s)).toBe(true);
    writeSoundOn(s, false);
    expect(readSoundOn(s)).toBe(false);
  });
  it('never throws when storage is blocked', () => {
    expect(readSoundOn(throwing)).toBe(false);
    expect(() => writeSoundOn(throwing, true)).not.toThrow();
    expect(readSoundOn(null)).toBe(false);
  });
});

describe('newOpenOrderCheck (history page → CO page)', () => {
  // Regression: with an order already open, "Historique" bounced straight back to the CO page.
  it('does not jump for orders already open when the history page opened', () => {
    const first = newOpenOrderCheck(null, ['a', 'b']);
    expect(first.jump).toBe(false);
    expect(newOpenOrderCheck(first.baseline, ['a', 'b']).jump).toBe(false);
  });
  it('jumps when a new order arrives', () => {
    const first = newOpenOrderCheck(null, ['a']);
    expect(newOpenOrderCheck(first.baseline, ['a', 'c']).jump).toBe(true);
  });
  it('forgets fulfilled orders', () => {
    const first = newOpenOrderCheck(null, ['a', 'b']);
    const second = newOpenOrderCheck(first.baseline, ['b']);
    expect(second.jump).toBe(false);
    expect([...second.baseline]).toEqual(['b']);
  });
  it('does not jump when nothing is open', () => {
    expect(newOpenOrderCheck(newOpenOrderCheck(null, []).baseline, []).jump).toBe(false);
  });
});
