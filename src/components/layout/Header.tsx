'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageToggle } from './LanguageToggle';

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gold-300/40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="oil-drop" style={{ width: 32, height: 32 }} />
          <span className="text-shimmer text-xl font-bold">{t('brand')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-gold-700 hover:text-gold-600 transition-colors text-sm font-medium">
            {t('nav.home')}
          </Link>
          <Link href="/scan" className="text-gold-700 hover:text-gold-600 transition-colors text-sm font-medium">
            {t('nav.scan')}
          </Link>
          <Link href="/detect" className="text-gold-700 hover:text-gold-600 transition-colors text-sm font-medium">
            {t('nav.detect')}
          </Link>
          <Link href="/recipes" className="text-gold-700 hover:text-gold-600 transition-colors text-sm font-medium">
            {t('nav.recipes')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-200 text-gold-700 font-medium">
            {t('demo')}
          </span>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
