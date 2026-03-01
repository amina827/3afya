'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onReset: () => void;
}

export function ProductCard({ product, onReset }: ProductCardProps) {
  const { t, lang } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="mt-8 max-w-md mx-auto"
    >
      {/* Success badge */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-200 text-gold-700 text-sm font-medium">
          <span>✓</span> {t('scanner.productFound')}
        </span>
      </div>

      {/* Product info card */}
      <div className="glass-card rounded-2xl p-6 text-center animate-pulseGlow">
        <span className="text-6xl block mb-4">{product.image}</span>

        <h3 className="text-gold-700 text-xl font-bold mb-2">
          {lang === 'ar' ? product.nameAr : product.nameEn}
        </h3>

        <p className="text-gold-600/60 text-sm mb-4 leading-relaxed">
          {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
        </p>

        <div className="flex justify-center gap-6 mb-6 text-sm">
          <div>
            <span className="text-gold-600">{t('scanner.volume')}</span>
            <div className="text-gold-700 font-bold text-lg">
              {product.volume} <span className="text-xs font-normal">{t('scanner.ml')}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link href={`/detect?product=${product.id}`}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gold-gradient text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-gold-600/30"
          >
            🔍 {t('scanner.checkLevel')}
          </motion.button>
        </Link>

        <button
          onClick={onReset}
          className="mt-3 text-gold-600 text-sm hover:text-gold-700 transition-colors"
        >
          ← {t('scanner.fallbackTitle')}
        </button>
      </div>
    </motion.div>
  );
}
