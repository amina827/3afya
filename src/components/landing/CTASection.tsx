'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

export function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-4 bg-gold-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-gold-gradient rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          {/* Decorative golden circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/15 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/15 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="oil-drop" style={{ width: 40, height: 40 }} />
            </div>
            <h2 className="text-white text-3xl md:text-4xl font-extrabold mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-white/80 text-lg mb-8">
              {t('cta.description')}
            </p>
            <Link href="/scan">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-gold-700 px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gold-50 transition-colors"
              >
                {t('cta.button')}
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
