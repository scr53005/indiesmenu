import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayInLuxembourg } from './menu';

const { tx, transaction, invalidate } = vi.hoisted(() => {
  const relation = () => ({ deleteMany: vi.fn(), createMany: vi.fn() });
  const tx = {
    dishes: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUniqueOrThrow: vi.fn() },
    drinks: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUniqueOrThrow: vi.fn() },
    categories: { findUnique: vi.fn(), findMany: vi.fn() },
    ingredients: { count: vi.fn() }, cuisson: { count: vi.fn() },
    categories_dishes: relation(), categories_drinks: relation(),
    dishes_ingredients: relation(), drinks_ingredients: relation(), dishes_cuisson: relation(),
    drink_sizes: { deleteMany: vi.fn(), upsert: vi.fn() },
  };
  return { tx, transaction: vi.fn(), invalidate: vi.fn() };
});
vi.mock('@/lib/prisma', () => ({ default: { $transaction: transaction } }));
vi.mock('@/lib/data/menu', () => ({ invalidateMenuCache: invalidate }));
import { deleteMenuItem, saveDish, saveDrink } from './menu-store';

beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  tx.dishes.create.mockResolvedValue({ dish_id: 7 });
  tx.dishes.update.mockResolvedValue({ dish_id: 7 });
  tx.dishes.findUniqueOrThrow.mockResolvedValue({ dish_id: 7 });
  tx.drinks.create.mockResolvedValue({ drink_id: 9 });
  tx.drinks.update.mockResolvedValue({ drink_id: 9 });
  tx.drinks.findUniqueOrThrow.mockResolvedValue({ drink_id: 9 });
  // Existing references match the requested IDs; an empty IN list matches no rows.
  tx.ingredients.count.mockImplementation(async ({ where }: { where: { ingredient_id: { in: number[] } } }) => where.ingredient_id.in.length);
  tx.cuisson.count.mockImplementation(async ({ where }: { where: { cuisson_id: { in: number[] } } }) => where.cuisson_id.in.length);
});

describe('transactional menu persistence', () => {
  it.each([
    { sold_out: true },
    { price_eur: '14.50', discount: 0.8 },
    { description: 'Description du plat du jour' },
  ])('keeps omitted associations and scalar fields untouched during inline updates: %o', async changes => {
    await saveDish(changes, 7);
    expect(tx.dishes.update).toHaveBeenCalledWith({ where: { dish_id: 7 }, data: changes });
    expect(tx.categories_dishes.deleteMany).not.toHaveBeenCalled();
    expect(tx.dishes_ingredients.deleteMany).not.toHaveBeenCalled();
    expect(tx.dishes_cuisson.deleteMany).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('creates a complete dish with the legacy category-name contract and today’s date', async () => {
    tx.categories.findUnique.mockResolvedValue({ category_id: 31, type: 'dish' });
    tx.categories.findMany.mockResolvedValue([{ category_id: 31, type: 'dish' }]);
    await saveDish({ name: 'Plat du jour', category: 'PLAT DU JOUR', price_eur: '0', discount: 0 });
    expect(tx.dishes.create).toHaveBeenCalledWith({ data: {
      name: 'Plat du jour', price_eur: '0', discount: 0,
      record_date: new Date(`${todayInLuxembourg()}T00:00:00.000Z`),
    } });
    expect(tx.categories_dishes.createMany).toHaveBeenCalledWith({ data: [{ dish_id: 7, category_id: 31 }] });
  });

  it('replaces all supplied dish relationships and preserves scalar nulls and zeros', async () => {
    tx.categories.findMany.mockResolvedValue([{ category_id: 25, type: 'dish' }]);
    await saveDish({ category_ids: [25], ingredient_ids: [3], cuisson_ids: [2], discount: 0,
      image: null, active: null, position: 0, record_date: '2026-10-28' }, 7);
    expect(tx.dishes.update).toHaveBeenCalledWith({ where: { dish_id: 7 }, data: {
      discount: 0, image: null, active: null, position: 0, record_date: new Date('2026-10-28T00:00:00.000Z'),
    } });
    expect(tx.dishes_ingredients.createMany).toHaveBeenCalledWith({ data: [{ dish_id: 7, ingredient_id: 3 }] });
    expect(tx.dishes_cuisson.createMany).toHaveBeenCalledWith({ data: [{ dish_id: 7, cuisson_id: 2 }] });
  });

  it('clears explicitly empty associations without clearing any omitted relationships', async () => {
    await saveDish({ ingredient_ids: [], cuisson_ids: [] }, 7);
    expect(tx.dishes_ingredients.deleteMany).toHaveBeenCalledWith({ where: { dish_id: 7 } });
    expect(tx.dishes_ingredients.createMany).not.toHaveBeenCalled();
    expect(tx.dishes_cuisson.deleteMany).toHaveBeenCalledWith({ where: { dish_id: 7 } });
    expect(tx.dishes_cuisson.createMany).not.toHaveBeenCalled();
    expect(tx.categories_dishes.deleteMany).not.toHaveBeenCalled();
  });

  it('clears drink ingredients without modifying omitted categories or sizes', async () => {
    await saveDrink({ ingredient_ids: [] }, 9);
    expect(tx.drinks_ingredients.deleteMany).toHaveBeenCalledWith({ where: { drink_id: 9 } });
    expect(tx.drinks_ingredients.createMany).not.toHaveBeenCalled();
    expect(tx.categories_drinks.deleteMany).not.toHaveBeenCalled();
    expect(tx.drink_sizes.deleteMany).not.toHaveBeenCalled();
    expect(tx.drink_sizes.upsert).not.toHaveBeenCalled();
  });

  it('rejects categories of the wrong product type before writing', async () => {
    tx.categories.findMany.mockResolvedValue([{ category_id: 4, type: 'drink' }]);
    await expect(saveDish({ category_ids: [4] }, 7)).rejects.toThrow('incompatible');
    expect(tx.dishes.update).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('rejects a missing ingredient before modifying a product', async () => {
    tx.ingredients.count.mockResolvedValue(0);
    await expect(saveDrink({ ingredient_ids: [3] }, 9)).rejects.toThrow('Ingrédient');
    expect(tx.drinks.update).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('updates drink sizes independently, retaining omitted dates and discounts on existing sizes', async () => {
    await saveDrink({ selection_mode: 'choose_one', sizes: [
      { size: '25cl', price_eur: '4', discount: 0, record_date: '2026-10-28' },
      { size: '50cl', price_eur: '7' },
    ] }, 9);
    expect(tx.drink_sizes.deleteMany).toHaveBeenCalledWith({ where: { drink_id: 9, size: { notIn: ['25cl', '50cl'] } } });
    expect(tx.drink_sizes.upsert).toHaveBeenNthCalledWith(1, {
      where: { drink_id_size: { drink_id: 9, size: '25cl' } },
      update: { price_eur: '4', discount: 0, record_date: new Date('2026-10-28T00:00:00.000Z') },
      create: { drink_id: 9, size: '25cl', price_eur: '4', discount: 0, record_date: new Date('2026-10-28T00:00:00.000Z') },
    });
    expect(tx.drink_sizes.upsert.mock.calls[1][0].update).toEqual({ price_eur: '7' });
    expect(tx.drinks_ingredients.deleteMany).not.toHaveBeenCalled();
  });

  it('does not invalidate the menu or report success if an association write fails', async () => {
    tx.dishes_ingredients.createMany.mockRejectedValue(new Error('relation write failed'));
    await expect(saveDish({ ingredient_ids: [3] }, 7)).rejects.toThrow('relation write failed');
    expect(tx.dishes.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('removes all dish join rows in the same transaction as the dish', async () => {
    await deleteMenuItem('dish', 7);
    for (const relation of [tx.categories_dishes, tx.dishes_ingredients, tx.dishes_cuisson]) {
      expect(relation.deleteMany).toHaveBeenCalledWith({ where: { dish_id: 7 } });
    }
    expect(tx.dishes.delete).toHaveBeenCalledWith({ where: { dish_id: 7 } });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('removes drink sizes and all drink join rows before deleting the drink', async () => {
    await deleteMenuItem('drink', 9);
    for (const relation of [tx.categories_drinks, tx.drinks_ingredients, tx.drink_sizes]) {
      expect(relation.deleteMany).toHaveBeenCalledWith({ where: { drink_id: 9 } });
    }
    expect(tx.drinks.delete).toHaveBeenCalledWith({ where: { drink_id: 9 } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
