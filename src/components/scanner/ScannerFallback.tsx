'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { products } from '@/data/products';
import { Product } from '@/types';

interface ScannerFallbackProps {
  onSelectProduct: (product: Product) => void;
}

export function ScannerFallback({ onSelectProduct }: ScannerFallbackProps) {
  const { t, lang } = useLanguage();

  return (
    <div className="mt-8">
      <div className="text-center mb-6">
        <h3 className="text-gold-700 text-lg font-bold mb-1">
          {t('scanner.fallbackTitle')}
        </h3>
        <p className="text-gold-600/50 text-sm">
          {t('scanner.fallbackDescription')}
        </p>
      </div>

      <div className="grid gap-3 max-w-md mx-auto">
        {products.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectProduct(product)}
            className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-gold-400 hover:shadow-lg hover:shadow-gold-400/10 transition-all text-start w-full group"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">
              {product.image}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-gold-700 font-bold text-sm truncate">
                {lang === 'ar' ? product.nameAr : product.nameEn}
              </h4>
              <p className="text-gold-600/50 text-xs truncate">
                {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
              </p>
              <span className="text-gold-600 text-xs">
                {product.volume} {t('scanner.ml')}
              </span>
            </div>
            <span className="text-gold-400 text-xl group-hover:text-gold-600 transition-colors flip-rtl">
              →
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
