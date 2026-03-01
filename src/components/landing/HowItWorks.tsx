'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

const steps = [
  { icon: '📱', key: 'howItWorks.step1', number: '1' },
  { icon: '🤖', key: 'howItWorks.step2', number: '2' },
  { icon: '✅', key: 'howItWorks.step3', number: '3' },
];

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #FFFDF5, #FFF8E1, #FFFDF5)' }}>
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-shimmer text-3xl md:text-4xl font-bold text-center mb-4"
        >
          {t('howItWorks.title')}
        </motion.h2>
        <div className="gold-divider max-w-[100px] mx-auto mb-16" />

        <div className="relative">
          {/* Timeline line - golden */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2"
            style={{ background: 'linear-gradient(90deg, transparent, #D4A017, #FFD700, #D4A017, transparent)' }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center"
              >
                {/* Step circle - golden gradient */}
                <div className="relative z-10 mx-auto w-20 h-20 rounded-full bg-gold-gradient flex items-center justify-center mb-6 shadow-lg shadow-gold-600/20">
                  <span className="text-3xl">{step.icon}</span>
                </div>

                {/* Step number badge */}
                <div className="absolute top-0 start-1/2 -translate-x-1/2 -translate-y-2 w-7 h-7 rounded-full bg-gold-400 flex items-center justify-center z-20 shadow-md">
                  <span className="text-white text-xs font-bold">{step.number}</span>
                </div>

                <h3 className="text-gold-700 text-lg font-bold mb-2">
                  {t(`${step.key}.title`)}
                </h3>
                <p className="text-gold-600/60 text-sm leading-relaxed">
                  {t(`${step.key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
