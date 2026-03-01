'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF8E1 30%, #FFECB3 60%, #FFE082 100%)' }}
    >
      {/* Background decorative golden circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Golden oil drop */}
          <motion.div
            className="flex justify-center mb-8"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="oil-drop oil-drop-lg" />
          </motion.div>

          {/* Brand name with golden shimmer */}
          <h1 className="text-shimmer text-7xl md:text-9xl font-extrabold mb-4 leading-tight">
            {t('hero.title')}
          </h1>

          <p className="text-gold-700 text-xl md:text-2xl font-medium mb-3">
            {t('hero.subtitle')}
          </p>

          <p className="text-gold-600/70 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('hero.description')}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/scan">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gold-gradient text-white px-8 py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-gold-600/30 hover:shadow-gold-600/50 transition-shadow min-w-[200px]"
              >
                📷 {t('hero.scanBtn')}
              </motion.button>
            </Link>
            <Link href="/detect">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/80 text-gold-700 px-8 py-3.5 rounded-xl font-bold text-lg border-2 border-gold-400/50 hover:bg-white hover:border-gold-400 transition-all min-w-[200px]"
              >
                🔍 {t('hero.detectBtn')}
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
