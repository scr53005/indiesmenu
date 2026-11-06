import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES, translations, type Language, type TranslationKey } from './translations';
import { interpolateParts, placeholders, translate } from './translate';

const frKeys = Object.keys(translations.fr) as TranslationKey[];
const langs = Object.keys(translations) as Language[];

describe('translations', () => {
  it('has no empty French string', () => {
    for (const key of frKeys) expect(translations.fr[key].trim(), key).not.toBe('');
  });
  it('has no key outside French in any language (no orphans after a rename)', () => {
    for (const lang of langs) {
      for (const key of Object.keys(translations[lang])) expect(frKeys, `${lang}.${key}`).toContain(key);
    }
  });
  it('uses the same placeholders as French in every language', () => {
    for (const lang of langs) {
      for (const [key, text] of Object.entries(translations[lang]) as [TranslationKey, string][]) {
        expect(placeholders(text).sort(), `${lang}.${key}`).toEqual(placeholders(translations.fr[key]).sort());
      }
    }
  });
  // Turns on for en/lb when R5 adds them to SUPPORTED_LANGUAGES.
  it('is complete for every language customers can choose', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const key of frKeys) expect(translations[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });
});

describe('translate', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('fr', 'kitchen.closedBody', { time: '21h30' })).toContain('fermé à 21h30 mais');
    expect(translate('fr', 'closed.body', { day: 'demain' })).toBe('Merci de nous rendre visite à nouveau demain à partir de {time}.');
  });
  it('falls back to French when a language lacks the key', () => {
    expect(translate('en', 'payment.success')).toBe(translations.en['payment.success'] ?? 'Paiement réussi!');
  });
});

describe('interpolateParts', () => {
  it('splits around placeholders so elements can be inserted', () => {
    expect(interpolateParts('Visit {day} at {time}.', { day: 'D', time: 'T' })).toEqual(['Visit ', 'D', ' at ', 'T', '.']);
    expect(interpolateParts('{a}{b}', { a: 1, b: 2 })).toEqual([1, 2]);
    expect(interpolateParts('no vars', {})).toEqual(['no vars']);
    expect(interpolateParts('keep {x}', {})).toEqual(['keep ', '{x}']);
  });
});
