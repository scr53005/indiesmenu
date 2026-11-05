import { describe, expect, it } from 'vitest';
import { describeDatabase, parseSetDiscountArgs, percentOffToMultiplier } from './discount';

describe('percentOffToMultiplier', () => {
  it('turns a percentage off into the stored multiplier without float residue', () => {
    expect(percentOffToMultiplier(10)).toBe(0.9);
    expect(percentOffToMultiplier(5)).toBe(0.95);
    expect(percentOffToMultiplier(12.5)).toBe(0.875);
    expect(percentOffToMultiplier(3.3)).toBe(0.967);
    expect(percentOffToMultiplier(0)).toBe(1);
  });
  it('rejects out-of-range or over-precise values', () => {
    expect(() => percentOffToMultiplier(-1)).toThrow();
    expect(() => percentOffToMultiplier(100)).toThrow();
    expect(() => percentOffToMultiplier(Number.NaN)).toThrow();
    expect(() => percentOffToMultiplier(1.234)).toThrow(/2 decimals/);
  });
});

describe('parseSetDiscountArgs', () => {
  it('defaults to a dry run over dishes and drinks', () => {
    expect(parseSetDiscountArgs(['--percent-off', '5'])).toEqual({ multiplier: 0.95, apply: false, tables: ['dishes', 'drinks'] });
  });
  it('applies only with --apply and can target one table', () => {
    expect(parseSetDiscountArgs(['--only', 'drinks', '--percent-off', '0', '--apply']))
      .toEqual({ multiplier: 1, apply: true, tables: ['drinks'] });
  });
  it('refuses missing, malformed or unknown arguments', () => {
    expect(() => parseSetDiscountArgs([])).toThrow(/required/);
    expect(() => parseSetDiscountArgs(['--percent-off'])).toThrow(/needs a number/);
    expect(() => parseSetDiscountArgs(['--percent-off', 'abc'])).toThrow(/needs a number/);
    expect(() => parseSetDiscountArgs(['--percent-off', '5', '--only', 'wines'])).toThrow(/dishes or drinks/);
    expect(() => parseSetDiscountArgs(['--percent-off', '5', '--yes'])).toThrow(/Unknown argument/);
  });
});

describe('describeDatabase', () => {
  it('shows host and database name but never the credentials', () => {
    const text = describeDatabase('postgres://user:s3cret@db.example.com:5432/indies?sslmode=require');
    expect(text).toBe('db.example.com:5432/indies');
    expect(text).not.toContain('s3cret');
  });
  it('copes with a missing or invalid URL', () => {
    expect(describeDatabase(undefined)).toMatch(/not set/);
    expect(describeDatabase('not a url')).toMatch(/unparseable/);
  });
});
