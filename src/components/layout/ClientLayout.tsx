'use client';

import { useEffect } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { useLanguage } from '@/hooks/useLanguage';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.documentElement.className = lang === 'ar' ? 'font-cairo' : 'font-inter';
  }, [lang, dir]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-safe">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LayoutInner>{children}</LayoutInner>
    </LanguageProvider>
  );
}
