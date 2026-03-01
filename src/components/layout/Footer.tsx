'use client';

import { useLanguage } from '@/hooks/useLanguage';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="hidden md:block bg-gold-50 border-t border-gold-300/30 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="gold-divider max-w-xs mx-auto mb-4" />
        <p className="text-gold-600 text-sm">
          {t('footer.text')} &copy; 2024 &middot; {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
