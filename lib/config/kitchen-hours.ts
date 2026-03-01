// Kitchen & restaurant hours configuration for Indies Cafe
// Will be refactored to DB-driven per-spoke in a later iteration

export interface ServiceWindow {
  open: number;  // minutes from midnight (e.g., 690 = 11h30)
  close: number;
}

export interface DaySchedule {
  lunch: ServiceWindow | null;
  dinner: ServiceWindow | null;
}

// 0=Sunday, 1=Monday ... 6=Saturday
export const KITCHEN_SCHEDULE: Record<number, DaySchedule> = {
  0: { lunch: null, dinner: null },                                          // Sunday: closed
  1: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1290 } }, // Mon: 11h30-14h30, 18h30-21h30
  2: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1290 } }, // Tue
  3: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1290 } }, // Wed
  4: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1290 } }, // Thu
  5: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1290 } }, // Fri
  6: { lunch: { open: 690, close: 870 }, dinner: { open: 1110, close: 1320 } }, // Sat: 11h30-14h30, 18h30-22h00
};

// Restaurant opening hours (bar + service, independent of kitchen)
// null = closed all day
export const RESTAURANT_HOURS: Record<number, ServiceWindow | null> = {
  0: null,                          // Sunday: closed
  1: { open: 600, close: 1439 },    // Mon: 10:00-23:59
  2: { open: 600, close: 1439 },    // Tue
  3: { open: 600, close: 1439 },    // Wed
  4: { open: 600, close: 1439 },    // Thu
  5: { open: 600, close: 1439 },    // Fri
  6: { open: 600, close: 1439 },    // Sat
};

/** Check if the restaurant is open at a given time on a given day */
export function isRestaurantOpen(dayOfWeek: number, totalMinutes: number): boolean {
  const hours = RESTAURANT_HOURS[dayOfWeek];
  if (!hours) return false;
  return totalMinutes >= hours.open && totalMinutes <= hours.close;
}

/** Get the next day the restaurant is open (name in FR and EN), plus opening time.
 *  Returns e.g. { fr: 'demain', en: 'tomorrow' } or { fr: 'lundi', en: 'Monday' }. */
export function getNextOpenDay(dayOfWeek: number): { fr: string; en: string; openTime: string } {
  const frDays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (dayOfWeek + offset) % 7;
    const hours = RESTAURANT_HOURS[nextDay];
    if (hours) {
      const h = Math.floor(hours.open / 60);
      const m = hours.open % 60;
      const openTime = `${h}h${m.toString().padStart(2, '0')}`;
      const fr = offset === 1 ? 'demain' : frDays[nextDay];
      const en = offset === 1 ? 'tomorrow' : enDays[nextDay];
      return { fr, en, openTime };
    }
  }
  return { fr: 'bientôt', en: 'soon', openTime: '10h00' };
}

/** Check if the kitchen is open at a given time on a given day */
export function isKitchenOpen(dayOfWeek: number, totalMinutes: number): boolean {
  const schedule = KITCHEN_SCHEDULE[dayOfWeek];
  if (!schedule) return false;
  const { lunch, dinner } = schedule;
  if (lunch && totalMinutes >= lunch.open && totalMinutes < lunch.close) return true;
  if (dinner && totalMinutes >= dinner.open && totalMinutes < dinner.close) return true;
  return false;
}

/** Get the closing time string for the current service window, or null if closed */
export function getKitchenCloseTime(dayOfWeek: number, totalMinutes: number): string | null {
  const schedule = KITCHEN_SCHEDULE[dayOfWeek];
  if (!schedule) return null;
  const { lunch, dinner } = schedule;
  // Check which window just ended or is about to end
  if (lunch && totalMinutes >= lunch.close && (!dinner || totalMinutes < dinner.open)) {
    const h = Math.floor(lunch.close / 60);
    const m = lunch.close % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
  if (dinner && totalMinutes >= dinner.close) {
    const h = Math.floor(dinner.close / 60);
    const m = dinner.close % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
  return null;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  /** ISO date string (YYYY-MM-DD) for which day this slot belongs to */
  date: string;
}

/** Get all valid FUTURE time slots (5-min increments).
 *  If no slots remain today, advances to the next open day (up to 7 days ahead).
 *  If requireKitchen=true, only returns slots within kitchen service windows.
 *  If requireKitchen=false (drinks-only), returns slots within restaurant opening hours.
 *  Each slot includes the target date so cross-day scheduling works correctly. */
export function getValidTimeSlots(dayOfWeek: number, requireKitchen: boolean): TimeSlot[] {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Try today first, then advance up to 6 more days to find the next open day
  for (let offset = 0; offset < 7; offset++) {
    const targetDay = (dayOfWeek + offset) % 7;
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + offset);
    // Use local date components (not UTC) to avoid timezone shift at midnight
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    // Only apply the "future" filter on the current day (offset=0)
    const minMinutes = offset === 0 ? nowMinutes + 10 : 0;

    // Restaurant must be open on this day for any slots
    const restHours = RESTAURANT_HOURS[targetDay];
    if (!restHours) continue; // e.g. Sunday — skip

    const slots: TimeSlot[] = [];

    if (!requireKitchen) {
      // Drinks: any time within restaurant opening hours
      for (let mins = restHours.open; mins <= restHours.close; mins += 5) {
        if (mins >= minMinutes) {
          slots.push({ hour: Math.floor(mins / 60), minute: mins % 60, date: dateStr });
        }
      }
      if (slots.length > 0) return slots;
      continue;
    }

    const schedule = KITCHEN_SCHEDULE[targetDay];
    if (!schedule) continue;

    for (const window of [schedule.lunch, schedule.dinner]) {
      if (!window) continue;
      for (let mins = window.open; mins < window.close; mins += 5) {
        if (mins >= minMinutes) {
          slots.push({ hour: Math.floor(mins / 60), minute: mins % 60, date: dateStr });
        }
      }
    }

    if (slots.length > 0) return slots;
  }

  return [];
}
