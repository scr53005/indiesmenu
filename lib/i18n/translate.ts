// Pure translation helpers (R2, 2026-11-05). No React here so they are unit-tested directly.
// Relative imports only: tested file (CLAUDE.md alias gotcha).
import { translations, type Language, type TranslationKey } from './translations';

export type Vars = Record<string, string | number>;

/** `{name}` placeholders, in order of appearance. */
export function placeholders(template: string): string[] {
  return Array.from(template.matchAll(/\{(\w+)\}/g), m => m[1]);
}

/** Text in `language`, falling back to French, then to the key itself (visible, never blank). */
export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const template = translations[language][key] ?? translations.fr[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole);
}

/**
 * Splits a template around its placeholders so a component can put React elements (e.g. a
 * <strong>) in them: 'Visit us {day} at {time}.' + {day: X, time: Y} → ['Visit us ', X, ' at ', Y, '.'].
 * Generic so this file stays React-free.
 */
export function interpolateParts<T>(template: string, values: Record<string, T>): (string | T)[] {
  const parts: (string | T)[] = [];
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(template.slice(last, index));
    parts.push(m[1] in values ? values[m[1]] : m[0]);
    last = index + m[0].length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return parts;
}
