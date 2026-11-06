'use client';

// Language provider for the customer menu (R2). Mirrors millewee's lib/i18n/context.tsx:
// language from localStorage, then the browser, then French; the server render and the
// hydration render always use French so both produce the same HTML.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, type Language, type TranslationKey } from './translations';
import { translate, type Vars } from './translate';

const STORAGE_KEY = 'indies_lang';

function isSupported(code: string | null | undefined): code is Language {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch { /* blocked storage: fall through */ }
  const browser = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : null;
  return isSupported(browser) ? browser : 'fr';
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => { setLanguageState(detectLanguage()); }, []);

  const setLanguage = useCallback((next: Language) => {
    if (!isSupported(next)) return;
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* not persisted */ }
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Vars) => translate(language, key, vars), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider> (app/menu/layout.tsx)');
  return context;
}
