import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { invalidateMenuCache } from '@/lib/data/menu';
import { MenuValidationError, todayInLuxembourg, type MenuInput, type MenuKind } from './menu';

export const dishInclude = {
  categories_dishes: true,
  dishes_ingredients: true,
  dishes_cuisson: true,
} satisfies Prisma.dishesInclude;
export const drinkInclude = {
  categories_drinks: true,
  drinks_ingredients: true,
  drink_sizes: { orderBy: { size: 'asc' as const } },
} satisfies Prisma.drinksInclude;

const dbDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

// Validate references inside the same transaction as the item and its associations.
async function checkReferences(tx: Prisma.TransactionClient, input: MenuInput, kind: MenuKind) {
  let categoryIds = input.category_ids;
  if (input.category !== undefined) {
    const category = await tx.categories.findUnique({ where: { name: input.category } });
    if (!category) throw new MenuValidationError('Catégorie introuvable.');
    categoryIds = [category.category_id];
  }
  if (categoryIds !== undefined) {
    const categories = await tx.categories.findMany({ where: { category_id: { in: categoryIds } } });
    if (categories.length !== categoryIds.length || categories.some(c => c.type && c.type !== kind)) {
      throw new MenuValidationError('Catégorie introuvable ou incompatible avec ce type de produit.');
    }
  }
  if (input.ingredient_ids !== undefined &&
      await tx.ingredients.count({ where: { ingredient_id: { in: input.ingredient_ids } } }) !== input.ingredient_ids.length) {
    throw new MenuValidationError('Ingrédient introuvable.');
  }
  if (input.cuisson_ids !== undefined &&
      await tx.cuisson.count({ where: { cuisson_id: { in: input.cuisson_ids } } }) !== input.cuisson_ids.length) {
    throw new MenuValidationError('Cuisson introuvable.');
  }
  return categoryIds;
}

export async function saveDish(input: MenuInput, id?: number) {
  const result = await prisma.$transaction(async tx => {
    const categoryIds = await checkReferences(tx, input, 'dish');
    const data = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price_eur !== undefined && { price_eur: input.price_eur }),
      ...(input.discount !== undefined && { discount: input.discount }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.sold_out !== undefined && { sold_out: input.sold_out }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.record_date !== undefined && { record_date: dbDate(input.record_date) }),
    };
    const dish = id === undefined
      ? await tx.dishes.create({ data: {
          ...data, name: input.name!, price_eur: input.price_eur!,
          record_date: dbDate(input.record_date ?? todayInLuxembourg()),
        } })
      : await tx.dishes.update({ where: { dish_id: id }, data });
    const dish_id = dish.dish_id;
    // Omitted relations stay untouched, notably for daily-specials partial updates.
    if (categoryIds !== undefined) {
      await tx.categories_dishes.deleteMany({ where: { dish_id } });
      if (categoryIds.length) await tx.categories_dishes.createMany({ data: categoryIds.map(category_id => ({ dish_id, category_id })) });
    }
    if (input.ingredient_ids !== undefined) {
      await tx.dishes_ingredients.deleteMany({ where: { dish_id } });
      if (input.ingredient_ids.length) await tx.dishes_ingredients.createMany({ data: input.ingredient_ids.map(ingredient_id => ({ dish_id, ingredient_id })) });
    }
    if (input.cuisson_ids !== undefined) {
      await tx.dishes_cuisson.deleteMany({ where: { dish_id } });
      if (input.cuisson_ids.length) await tx.dishes_cuisson.createMany({ data: input.cuisson_ids.map(cuisson_id => ({ dish_id, cuisson_id })) });
    }
    return tx.dishes.findUniqueOrThrow({ where: { dish_id }, include: dishInclude });
  });
  invalidateMenuCache();
  console.warn(`[ADMIN MENU] Dish ${result.dish_id} ${id === undefined ? 'created' : 'updated'}`);
  return result;
}

export async function saveDrink(input: MenuInput, id?: number) {
  const result = await prisma.$transaction(async tx => {
    const categoryIds = await checkReferences(tx, input, 'drink');
    const data = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.selection_mode !== undefined && { selection_mode: input.selection_mode }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.record_date !== undefined && { record_date: dbDate(input.record_date) }),
    };
    const drink = id === undefined
      ? await tx.drinks.create({ data: { ...data, name: input.name!, record_date: dbDate(input.record_date ?? todayInLuxembourg()) } })
      : await tx.drinks.update({ where: { drink_id: id }, data });
    const drink_id = drink.drink_id;
    if (categoryIds !== undefined) {
      await tx.categories_drinks.deleteMany({ where: { drink_id } });
      if (categoryIds.length) await tx.categories_drinks.createMany({ data: categoryIds.map(category_id => ({ drink_id, category_id })) });
    }
    if (input.ingredient_ids !== undefined) {
      await tx.drinks_ingredients.deleteMany({ where: { drink_id } });
      if (input.ingredient_ids.length) await tx.drinks_ingredients.createMany({ data: input.ingredient_ids.map(ingredient_id => ({ drink_id, ingredient_id })) });
    }
    if (input.sizes !== undefined) {
      // Upsert unchanged size keys so their date/discount survive partial API clients.
      await tx.drink_sizes.deleteMany({ where: { drink_id, size: { notIn: input.sizes.map(size => size.size) } } });
      for (const size of input.sizes) {
        const sizeData = {
          price_eur: size.price_eur,
          ...(size.discount !== undefined && { discount: size.discount }),
          ...(size.record_date !== undefined && { record_date: dbDate(size.record_date) }),
        };
        await tx.drink_sizes.upsert({
          where: { drink_id_size: { drink_id, size: size.size } },
          update: sizeData,
          create: { ...sizeData, drink_id, size: size.size, record_date: dbDate(size.record_date ?? todayInLuxembourg()) },
        });
      }
    }
    return tx.drinks.findUniqueOrThrow({ where: { drink_id }, include: drinkInclude });
  });
  invalidateMenuCache();
  console.warn(`[ADMIN MENU] Drink ${result.drink_id} ${id === undefined ? 'created' : 'updated'}`);
  return result;
}

export async function deleteMenuItem(kind: MenuKind, id: number) {
  await prisma.$transaction(async tx => {
    if (kind === 'dish') {
      await tx.categories_dishes.deleteMany({ where: { dish_id: id } });
      await tx.dishes_ingredients.deleteMany({ where: { dish_id: id } });
      await tx.dishes_cuisson.deleteMany({ where: { dish_id: id } });
      await tx.dishes.delete({ where: { dish_id: id } });
    } else {
      await tx.categories_drinks.deleteMany({ where: { drink_id: id } });
      await tx.drinks_ingredients.deleteMany({ where: { drink_id: id } });
      await tx.drink_sizes.deleteMany({ where: { drink_id: id } });
      await tx.drinks.delete({ where: { drink_id: id } });
    }
  });
  invalidateMenuCache();
  console.warn(`[ADMIN MENU] ${kind} ${id} deleted`);
}
