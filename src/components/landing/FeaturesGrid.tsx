'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

const features = [
  { icon: '📷', key: 'features.scan', color: 'gold' },
  { icon: '🔍', key: 'features.detect', color: 'green' },
  { icon: '📖', key: 'features.recipes', color: 'gold' },
];

export function FeaturesGrid() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-4 bg-green-section">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-shimmer-green text-3xl md:text-4xl font-bold text-center mb-4"
        >
          {t('features.title')}
        </motion.h2>
        <div className="green-divider max-w-[100px] mx-auto mb-14" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className={`rounded-2xl p-8 text-center transition-all group ${
                feature.color === 'green'
                  ? 'glass-card-green hover:border-green-400 hover:shadow-lg hover:shadow-green-400/10'
                  : 'glass-card hover:border-gold-400 hover:shadow-lg hover:shadow-gold-400/10'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${
                feature.color === 'green' ? 'bg-green-100' : 'bg-gold-100'
              }`}>
                {feature.icon}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${
                feature.color === 'green' ? 'text-green-700' : 'text-gold-700'
              }`}>
                {t(`${feature.key}.title`)}
              </h3>
              <p className="text-gold-600/60 text-sm leading-relaxed">
                {t(`${feature.key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
