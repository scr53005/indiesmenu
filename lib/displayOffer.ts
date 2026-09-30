import { isWithinHappyHourWindow } from './happyHour';

export const BREAKFAST_IMAGE_PATH = '/images/breakfast.jpeg';

// Production breakfast window: 07:00 inclusive until 11:15 exclusive.
export const BREAKFAST_START_MINUTES = 7 * 60;
export const BREAKFAST_END_MINUTES = 11 * 60 + 15;

export type DisplayOffer = 'breakfast' | 'happy-hour' | 'regular';

/**
 * Breakfast is offered every day. The end is exclusive so the next display
 * takes over as soon as the closing minute begins.
 */
export function isWithinBreakfastWindow(minutesOfDay: number): boolean {
  return minutesOfDay >= BREAKFAST_START_MINUTES && minutesOfDay < BREAKFAST_END_MINUTES;
}

/**
 * Resolve one display mode for the current Luxembourg wall-clock time.
 */
export function getActiveDisplayOffer(day: number, minutesOfDay: number): DisplayOffer {
  if (isWithinBreakfastWindow(minutesOfDay)) return 'breakfast';
  if (isWithinHappyHourWindow(day, minutesOfDay)) return 'happy-hour';
  return 'regular';
}
