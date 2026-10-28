import { describe, expect, it } from 'vitest';
import { effectivePrice, isMenuImageUrl, parseMenuId, parseMenuInput } from './menu';
import { toggleImageAssignment } from './image-assignments';

const dish = { name: 'Burger', price_eur: '15.50', category_ids: [25] };
const drink = { name: 'Bière', category_ids: [4], sizes: [{ size: '25cl', price_eur: '4.00' }] };

describe('admin menu validation', () => {
  it('accepts free items and preserves a zero discount instead of replacing it with 1', () => {
    expect(parseMenuInput({ ...dish, price_eur: '0', discount: 0 }, 'dish', true)).toMatchObject({ price_eur: '0', discount: 0 });
    expect(effectivePrice('15.50', 0)).toBe('0.00');
    expect(effectivePrice('15.50', 0.8)).toBe('12.40');
    expect(effectivePrice('15.50', null)).toBe('15.50');
  });

  it('preserves the partial-update contract used by daily specials', () => {
    expect(parseMenuInput({ sold_out: true }, 'dish', false)).toEqual({ sold_out: true });
  });

  it('accepts legacy creation by category name', () => {
    expect(parseMenuInput({ name: 'Suggestion', price_eur: '14', category: 'SUGGESTION' }, 'dish', true))
      .toEqual({ name: 'Suggestion', price_eur: '14', category: 'SUGGESTION' });
  });

  it('distinguishes omitted associations, explicitly cleared associations, and null scalar values', () => {
    expect(parseMenuInput({ ingredient_ids: [], cuisson_ids: [], image: '', discount: null, active: null, position: null }, 'dish', false))
      .toEqual({ ingredient_ids: [], cuisson_ids: [], image: null, discount: null, active: null, position: null });
    expect(parseMenuInput({ category_ids: [25, 25], description: '' }, 'dish', false))
      .toEqual({ category_ids: [25], description: null });
  });

  it.each(['-1', '1.001', '', 'NaN', '100000000.00', true, null])('rejects invalid monetary value %s', value => {
    expect(() => parseMenuInput({ ...dish, price_eur: value }, 'dish', true)).toThrow();
  });

  it.each([-0.1, 1.01, Infinity, 'garbage', true])('rejects invalid discount %s', value => {
    expect(() => parseMenuInput({ ...dish, discount: value }, 'dish', true)).toThrow();
  });

  it('validates dates without silently rolling invalid days into the next month', () => {
    expect(() => parseMenuInput({ ...dish, record_date: '2026-02-30' }, 'dish', true)).toThrow();
    expect(parseMenuInput({ ...dish, record_date: '2028-02-29' }, 'dish', true).record_date).toBe('2028-02-29');
  });

  it('validates every drink size, price, coefficient and date', () => {
    expect(parseMenuInput({ ...drink, selection_mode: 'choose_one', sizes: [
      { size: '25cl', price_eur: '4.00', discount: 0, record_date: '2026-10-28' },
      { size: '50cl', price_eur: '7', discount: null },
    ] }, 'drink', true)).toMatchObject({ selection_mode: 'choose_one', sizes: [
      { size: '25cl', price_eur: '4.00', discount: 0, record_date: '2026-10-28' },
      { size: '50cl', price_eur: '7', discount: null },
    ] });
    expect(() => parseMenuInput({ ...drink, sizes: [] }, 'drink', true)).toThrow();
    expect(() => parseMenuInput({ ...drink, sizes: [...drink.sizes, ...drink.sizes] }, 'drink', true)).toThrow('double');
    expect(() => parseMenuInput({ ...drink, sizes: [{ size: '25cl', price_eur: '' }] }, 'drink', true)).toThrow();
  });

  it('rejects invalid IDs and malformed relation lists', () => {
    for (const id of ['0', '-1', '3oops', '1.2', '2147483648']) expect(() => parseMenuId(id)).toThrow();
    expect(parseMenuId('17')).toBe(17);
    expect(() => parseMenuInput({ ...dish, ingredient_ids: ['2'] }, 'dish', true)).toThrow();
  });

  it('only accepts public image paths or HTTP(S) URLs, within the schema limit', () => {
    expect(isMenuImageUrl('/images/burger.webp')).toBe(true);
    expect(isMenuImageUrl('https://store.public.blob.vercel-storage.com/menu/photo.webp')).toBe(true);
    for (const path of ['javascript:alert(1)', '//other.example/photo.jpg', '/images/../secret']) {
      expect(() => parseMenuInput({ image: path }, 'dish', false)).toThrow();
    }
    expect(() => parseMenuInput({ image: `https://example.com/${'x'.repeat(255)}` }, 'dish', false)).toThrow();
  });
});

describe('image-assignment selection', () => {
  it('replaces an earlier image for the same product, keeping the API target unique', () => {
    const first = { imageName: 'a.jpg', itemType: 'dish' as const, itemId: 1 };
    const next = { ...first, imageName: 'b.jpg' };
    expect(toggleImageAssignment([first], next)).toEqual([next]);
    expect(toggleImageAssignment([next], next)).toEqual([]);
  });
  it('allows one image on several products, including dish/drink IDs that overlap', () => {
    const first = { imageName: 'a.jpg', itemType: 'dish' as const, itemId: 1 };
    const second = { ...first, itemType: 'drink' as const };
    expect(toggleImageAssignment([first], second)).toEqual([first, second]);
  });
});
