import { describe, expect, it } from 'vitest';
import {
  getActiveDisplayOffer,
  isWithinBreakfastWindow,
} from './displayOffer';

describe('isWithinBreakfastWindow', () => {
  const m = (hour: number, minute: number) => hour * 60 + minute;

  it('opens exactly at 07:00', () => {
    expect(isWithinBreakfastWindow(m(6, 59))).toBe(false);
    expect(isWithinBreakfastWindow(m(7, 0))).toBe(true);
  });

  it('closes exactly at 11:15', () => {
    expect(isWithinBreakfastWindow(m(11, 14))).toBe(true);
    expect(isWithinBreakfastWindow(m(11, 15))).toBe(false);
  });
});

describe('getActiveDisplayOffer', () => {
  const m = (hour: number, minute: number) => hour * 60 + minute;
  const WED = 3;
  const SAT = 6;

  it('shows breakfast during the morning on weekdays', () => {
    expect(getActiveDisplayOffer(WED, m(8, 30))).toBe('breakfast');
  });

  it('returns to the regular display at 11:15 on weekdays', () => {
    expect(getActiveDisplayOffer(WED, m(11, 15))).toBe('regular');
  });

  it('shows breakfast every day, including weekends', () => {
    expect(getActiveDisplayOffer(SAT, m(8, 30))).toBe('breakfast');
  });

  it('keeps the existing happy-hour schedule unchanged', () => {
    expect(getActiveDisplayOffer(WED, m(15, 0))).toBe('happy-hour');
    expect(getActiveDisplayOffer(SAT, m(15, 0))).toBe('regular');
  });
});
