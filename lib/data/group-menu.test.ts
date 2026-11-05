import { describe, expect, it } from 'vitest';
import { defaultMenuSection, groupMenu, luxembourgMinutes } from './group-menu';
import type { MenuData } from './menu';

const dish = (id: string, categoryIds: number[], image?: string) =>
  ({ id, name: id, type: 'dish', price: '10.00', discount: 1, categoryIds, cuissons: [], ingredients: [], image }) as const;
const drink = (id: string, categoryIds: number[]) =>
  ({ id, name: id, type: 'drink', availableSizes: [], categoryIds, ingredients: [] }) as const;

const menu = {
  categories: [{ category_id: 30, name: 'SUGGESTION' }, { category_id: 26, name: 'SAUCES' }, { category_id: 22, name: 'SALADES' }, { category_id: 40, name: 'BIERES' }],
  dishes: [dish('a', [22]), dish('b', [22], '/images/b.jpg'), dish('c', [30]), dish('sauce', [26])],
  drinks: [drink('beer', [40])],
  cuissons: [], ingredients: [], conversion_rate: 1,
} as unknown as MenuData;

describe('groupMenu', () => {
  it('keeps the category order, drops sauces and empty categories, puts pictured items first', () => {
    const { dishes, drinks } = groupMenu(menu);
    expect(dishes.map(c => c.name)).toEqual(['SUGGESTION', 'SALADES']);
    expect(dishes[1].items.map(d => d.id)).toEqual(['b', 'a']);
    expect(drinks.map(c => c.name)).toEqual(['BIERES']);
  });
  it('returns nothing for an empty menu', () => {
    expect(groupMenu({ ...menu, categories: [], dishes: [], drinks: [] })).toEqual({ dishes: [], drinks: [] });
  });
});

describe('defaultMenuSection', () => {
  it('shows dishes during lunch and dinner service, drinks otherwise', () => {
    expect(defaultMenuSection(704)).toBe('drinks');
    expect(defaultMenuSection(705)).toBe('dishes'); // 11:45
    expect(defaultMenuSection(855)).toBe('dishes'); // 14:15
    expect(defaultMenuSection(856)).toBe('drinks');
    expect(defaultMenuSection(1110)).toBe('dishes'); // 18:30
    expect(defaultMenuSection(1320)).toBe('drinks'); // 22:00
  });
});

describe('luxembourgMinutes', () => {
  it('uses Luxembourg time whatever the machine time zone (winter UTC+1, summer UTC+2)', () => {
    expect(luxembourgMinutes(new Date('2026-01-15T11:30:00Z'))).toEqual({ minutes: 12 * 60 + 30, dayOfWeek: 4 });
    expect(luxembourgMinutes(new Date('2026-07-15T11:30:00Z'))).toEqual({ minutes: 13 * 60 + 30, dayOfWeek: 3 });
  });
  it('rolls over to the next day after local midnight', () => {
    expect(luxembourgMinutes(new Date('2026-01-15T23:10:00Z'))).toEqual({ minutes: 10, dayOfWeek: 5 });
  });
});
