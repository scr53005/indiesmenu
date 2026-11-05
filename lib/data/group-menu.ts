// Pure menu shaping for app/menu/page.tsx. It runs during render (not in an effect) so the
// server-rendered HTML already lists the dishes (INDIESMENU-REFACTOR-PLAN.md phase P).
// Relative import: tested file (CLAUDE.md alias gotcha).
import type { FormattedDish, FormattedDrink, MenuData } from './menu';

export interface GroupedCategory<T> {
  id: number;
  name: string;
  items: T[];
}

/** Category 26 (sauces) is never shown as a section. */
const HIDDEN_CATEGORY_IDS = new Set([26]);

function byImageFirst<T extends { image?: string }>(a: T, b: T): number {
  if (a.image && !b.image) return -1;
  if (!a.image && b.image) return 1;
  return 0; // stable sort keeps the API order otherwise
}

/** Dishes and drinks grouped by category, in the API's category order, empty categories dropped. */
export function groupMenu(menu: MenuData): {
  dishes: GroupedCategory<FormattedDish>[];
  drinks: GroupedCategory<FormattedDrink>[];
} {
  const categories = menu.categories.filter(cat => !HIDDEN_CATEGORY_IDS.has(cat.category_id));
  const group = <T extends { categoryIds: number[]; image?: string }>(items: T[]): GroupedCategory<T>[] =>
    categories
      .map(cat => ({
        id: cat.category_id as number,
        name: cat.name as string,
        items: items.filter(item => item.categoryIds.includes(cat.category_id)).sort(byImageFirst),
      }))
      .filter(cat => cat.items.length > 0);
  return { dishes: group(menu.dishes), drinks: group(menu.drinks) };
}

/** Minutes since midnight, Luxembourg time, whatever the server's or phone's time zone. */
export function luxembourgMinutes(now: Date): { minutes: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Luxembourg', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24; // some engines print midnight as "24"
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { minutes: hour * 60 + Number(get('minute')), dayOfWeek: days.indexOf(get('weekday')) };
}

/** Dishes during lunch (11:45–14:15) and dinner (18:30–21:59) service, drinks otherwise. */
export function defaultMenuSection(minutes: number): 'dishes' | 'drinks' {
  const lunch = minutes >= 705 && minutes <= 855;
  const dinner = minutes >= 1110 && minutes <= 1319;
  return lunch || dinner ? 'dishes' : 'drinks';
}
