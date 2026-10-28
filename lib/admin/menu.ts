// Shared JSON contracts and validation; no database or browser dependencies.
export type MenuKind = 'dish' | 'drink';
export interface MenuCategory { category_id: number; name: string; type: string | null }
export interface MenuIngredient {
  ingredient_id: number;
  name: string;
  ingredients_alergenes: { alergenes: { name_fr: string } }[];
}
export interface MenuOptions {
  categories: MenuCategory[];
  ingredients: MenuIngredient[];
  cuissons: { cuisson_id: number; french_name: string; english_name: string }[];
}
export interface DrinkSize {
  size: string;
  price_eur: string | number;
  discount: number | null;
  record_date: string;
}
interface MenuRecord {
  name: string;
  description: string | null;
  image: string | null;
  record_date: string;
}
export interface AdminDish extends MenuRecord {
  dish_id: number;
  price_eur: string | number;
  discount: number | null;
  position: number | null;
  active: boolean | null;
  sold_out: boolean | null;
  categories_dishes: { category_id: number }[];
  dishes_ingredients: { ingredient_id: number }[];
  dishes_cuisson: { cuisson_id: number }[];
}
export interface AdminDrink extends MenuRecord {
  drink_id: number;
  selection_mode: string | null;
  categories_drinks: { category_id: number }[];
  drinks_ingredients: { ingredient_id: number }[];
  drink_sizes: DrinkSize[];
}
export interface SizeInput {
  size: string;
  price_eur: string;
  discount?: number | null;
  record_date?: string;
}
export interface MenuInput {
  name?: string;
  description?: string | null;
  image?: string | null;
  record_date?: string;
  price_eur?: string;
  discount?: number | null;
  active?: boolean | null;
  sold_out?: boolean | null;
  position?: number | null;
  selection_mode?: string | null;
  category_ids?: number[];
  ingredient_ids?: number[];
  cuisson_ids?: number[];
  sizes?: SizeInput[];
  // Kept for the existing daily-specials client.
  category?: string;
}

export class MenuValidationError extends Error {}
function invalid(message: string): never { throw new MenuValidationError(message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Données de menu invalides.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') invalid(`${label} doit être un texte.`);
  const result = value.trim();
  if (!result || result.length > max) invalid(`${label} : entre 1 et ${max} caractères.`);
  return result;
}
function optionalText(value: unknown, label: string, max: number): string | null {
  return value === null || value === '' ? null : text(value, label, max);
}
function price(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      !/^\d{1,8}(\.\d{1,2})?$/.test(String(value).trim())) {
    invalid('Prix invalide : montant positif ou nul, avec deux décimales maximum.');
  }
  return String(value).trim();
}
function discount(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') invalid('Coefficient de remise invalide.');
  const result = Number(value);
  if (!String(value).trim() || !Number.isFinite(result) || result < 0 || result > 1) {
    invalid('Le coefficient de remise doit être compris entre 0 et 1 (1 = aucune remise).');
  }
  return result;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('Date invalide (AAAA-MM-JJ).');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid('Date invalide.');
  return value;
}
function ids(value: unknown): number[] {
  if (!Array.isArray(value) || value.some(id => !Number.isSafeInteger(id) || id <= 0 || id > 2147483647)) {
    invalid('Les associations doivent contenir des identifiants entiers positifs.');
  }
  return [...new Set(value as number[])];
}

export function parseMenuInput(value: unknown, kind: MenuKind, creating: boolean): MenuInput {
  const body = object(value);
  const result: MenuInput = {};
  if (creating || 'name' in body) result.name = text(body.name, 'Nom', 200);
  if ('description' in body) result.description = optionalText(body.description, 'Description', 100000);
  if ('image' in body) {
    result.image = optionalText(body.image, 'Image', 255);
    if (result.image && !isMenuImageUrl(result.image)) invalid('Image : utilisez /images/… ou une URL HTTP(S).');
  }
  if ('record_date' in body) result.record_date = date(body.record_date);
  if ('category_ids' in body) result.category_ids = ids(body.category_ids);
  if ('ingredient_ids' in body) result.ingredient_ids = ids(body.ingredient_ids);
  if ('category' in body) {
    if ('category_ids' in body) invalid('Indiquez category ou category_ids, pas les deux.');
    result.category = text(body.category, 'Catégorie', 100);
  }
  if (creating && !result.category && !result.category_ids?.length) invalid('Choisissez au moins une catégorie.');

  if (kind === 'dish') {
    if (creating || 'price_eur' in body) result.price_eur = price(body.price_eur);
    if ('discount' in body) result.discount = discount(body.discount);
    if ('cuisson_ids' in body) result.cuisson_ids = ids(body.cuisson_ids);
    for (const key of ['active', 'sold_out'] as const) {
      if (key in body) {
        if (body[key] !== null && typeof body[key] !== 'boolean') invalid(`${key} doit être booléen ou nul.`);
        result[key] = body[key] as boolean | null;
      }
    }
    if ('position' in body) {
      if (body.position !== null && (!Number.isInteger(body.position) ||
          Number(body.position) < -2147483648 || Number(body.position) > 2147483647)) invalid('Position entière invalide.');
      result.position = body.position as number | null;
    }
  } else {
    if ('selection_mode' in body) result.selection_mode = optionalText(body.selection_mode, 'Mode de sélection', 20);
    if (creating || 'sizes' in body) {
      if (!Array.isArray(body.sizes) || !body.sizes.length) invalid('Ajoutez au moins une taille avec son prix.');
      const seen = new Set<string>();
      result.sizes = body.sizes.map((entry: unknown) => {
        const item = object(entry);
        const size = text(item.size, 'Taille', 50);
        if (seen.has(size)) invalid(`Taille en double : ${size}.`);
        seen.add(size);
        return {
          size,
          price_eur: price(item.price_eur),
          ...('discount' in item ? { discount: discount(item.discount) } : {}),
          ...('record_date' in item ? { record_date: date(item.record_date) } : {}),
        };
      });
    }
  }
  return result;
}

export function parseMenuId(value: string): number {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    invalid('Identifiant invalide.');
  }
  return Number(value);
}

export function isMenuImageUrl(value: string): boolean {
  if (/^\/images\/[^?#\\]+$/i.test(value) && !value.split('/').includes('..')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

export function effectivePrice(priceValue: string | number, coefficient: number | null | undefined): string {
  return (Number(priceValue) * (coefficient ?? 1)).toFixed(2);
}

export function todayInLuxembourg(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Luxembourg' }).format(new Date());
}
