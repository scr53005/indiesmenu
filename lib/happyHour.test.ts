import { describe, it, expect } from 'vitest';
import { isWithinHappyHourWindow } from './happyHour';

// Boundary-pinning tests for the happy-hour window (Mon–Fri, 14:50–17:45).
// The window was moved from 14:45–18:00 to 14:50–17:45; these lock the new edges
// so a future tweak can't silently drift them back.
describe('isWithinHappyHourWindow', () => {
  const m = (h: number, min: number) => h * 60 + min;
  const WED = 3; // a weekday
  const SAT = 6;
  const SUN = 0;

  it('is inside the window mid-afternoon on a weekday', () => {
    expect(isWithinHappyHourWindow(WED, m(16, 0))).toBe(true);
  });

  it('opens exactly at 14:50 (inclusive)', () => {
    expect(isWithinHappyHourWindow(WED, m(14, 50))).toBe(true);
    expect(isWithinHappyHourWindow(WED, m(14, 49))).toBe(false);
  });

  it('closes exactly at 17:45 (exclusive)', () => {
    expect(isWithinHappyHourWindow(WED, m(17, 44))).toBe(true);
    expect(isWithinHappyHourWindow(WED, m(17, 45))).toBe(false);
  });

  it('is closed on weekends even during the afternoon window', () => {
    expect(isWithinHappyHourWindow(SAT, m(16, 0))).toBe(false);
    expect(isWithinHappyHourWindow(SUN, m(16, 0))).toBe(false);
  });

  it('is closed on a weekday outside the afternoon window', () => {
    expect(isWithinHappyHourWindow(WED, m(12, 0))).toBe(false);
    expect(isWithinHappyHourWindow(WED, m(18, 0))).toBe(false);
  });

  it('covers Monday and Friday (window edges of the week)', () => {
    expect(isWithinHappyHourWindow(1, m(15, 0))).toBe(true); // Mon
    expect(isWithinHappyHourWindow(5, m(15, 0))).toBe(true); // Fri
  });
});
