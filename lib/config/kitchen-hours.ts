// Kitchen hours configuration for Indies Cafe
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

/** Get all valid FUTURE time slots (5-min increments) for a given day.
 *  Only returns slots that are at least 10 minutes in the future.
 *  If requireKitchen=true, only returns slots within kitchen service windows.
 *  If requireKitchen=false (drinks-only), returns all hours 8h-23h. */
export function getValidTimeSlots(dayOfWeek: number, requireKitchen: boolean): { hour: number; minute: number }[] {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const minFutureMinutes = nowMinutes + 10; // at least 10 min from now

  const slots: { hour: number; minute: number }[] = [];

  if (!requireKitchen) {
    for (let h = 8; h <= 23; h++) {
      for (let m = 0; m < 60; m += 5) {
        if (h * 60 + m >= minFutureMinutes) {
          slots.push({ hour: h, minute: m });
        }
      }
    }
    return slots;
  }

  const schedule = KITCHEN_SCHEDULE[dayOfWeek];
  if (!schedule) return []; // Sunday — no kitchen slots

  for (const window of [schedule.lunch, schedule.dinner]) {
    if (!window) continue;
    for (let mins = window.open; mins < window.close; mins += 5) {
      if (mins >= minFutureMinutes) {
        slots.push({ hour: Math.floor(mins / 60), minute: mins % 60 });
      }
    }
  }
  return slots;
}
