'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';

const navItems = [
  { href: '/', icon: '🏠', key: 'nav.home' },
  { href: '/scan', icon: '📷', key: 'nav.scan' },
  { href: '/detect', icon: '🔍', key: 'nav.detect' },
  { href: '/slider', icon: '🧮', key: 'nav.slider' },
  { href: '/recipes', icon: '📖', key: 'nav.recipes' },
  { href: '/training', icon: '🧪', key: 'nav.training' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-gold-300/40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'text-gold-700 bg-gold-100'
                  : 'text-gold-500 hover:text-gold-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
