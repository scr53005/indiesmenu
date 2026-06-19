import { describe, it, expect } from 'vitest';

/**
 * Characterization test for the "leading table number" parse used when reading a
 * table identifier from free-form input: capture an integer only when it stands
 * alone or is followed by whitespace (so "12 34" yields "12", but "123abc" is
 * rejected as not a clean table number).
 */
function parseLeadingTableNumber(input: string): string | null {
  return input.match(/^(\d+)(?:\s|$)/)?.[1] ?? null;
}

describe('parseLeadingTableNumber', () => {
  it('matches a bare number', () => {
    expect(parseLeadingTableNumber('123')).toBe('123');
  });

  it('matches a number followed by a trailing space', () => {
    expect(parseLeadingTableNumber('123 ')).toBe('123');
  });

  it('captures only the leading group when more follows after a space', () => {
    expect(parseLeadingTableNumber('12 34')).toBe('12');
  });

  it('rejects a number glued to letters', () => {
    expect(parseLeadingTableNumber('123abc')).toBeNull();
  });

  it('rejects empty and non-numeric input', () => {
    expect(parseLeadingTableNumber('')).toBeNull();
    expect(parseLeadingTableNumber('abc')).toBeNull();
  });
});
