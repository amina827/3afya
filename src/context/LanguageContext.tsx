'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Language, Translations } from '@/types';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  toggleLanguage: () => {},
  t: (key: string) => key,
  dir: 'rtl',
});

const translations: Record<Language, Translations> = { ar, en };

function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.');
  let current: string | Translations = obj;
  for (const key of keys) {
    if (typeof current === 'string') return path;
    current = (current as Translations)[key];
    if (current === undefined) return path;
  }
  return typeof current === 'string' ? current : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[lang], key);
    },
    [lang]
  );

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}
