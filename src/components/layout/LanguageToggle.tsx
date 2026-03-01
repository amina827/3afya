'use client';

import { useLanguage } from '@/hooks/useLanguage';

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-100 hover:bg-gold-200 border border-gold-400/40 text-gold-700 text-sm font-medium transition-all hover:scale-105 active:scale-95"
      aria-label="Toggle language"
    >
      <span className="text-xs">🌐</span>
      <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}
