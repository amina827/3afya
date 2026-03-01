'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

const tips = [
  {
    titleAr: 'فيتامين E',
    titleEn: 'Vitamin E',
    descAr: 'زيت عافية غني بفيتامين E المضاد للأكسدة الذي يحمي خلايا الجسم',
    descEn: 'Afia oil is rich in Vitamin E antioxidant that protects body cells',
    icon: '💊',
    color: 'green',
  },
  {
    titleAr: 'خالي من الكوليسترول',
    titleEn: 'Cholesterol Free',
    descAr: 'زيت نباتي 100% خالي من الكوليسترول لصحة قلبك',
    descEn: '100% vegetable oil, cholesterol-free for your heart health',
    icon: '❤️',
    color: 'gold',
  },
  {
    titleAr: 'أوميغا 6 و 9',
    titleEn: 'Omega 6 & 9',
    descAr: 'يحتوي على أحماض دهنية أساسية مهمة لصحة الجسم',
    descEn: 'Contains essential fatty acids important for body health',
    icon: '🧬',
    color: 'green',
  },
];

export function HealthTips() {
  const { lang } = useLanguage();

  return (
    <section className="py-20 px-4 bg-green-section">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-shimmer-green text-3xl md:text-4xl font-bold mb-4">
            {lang === 'ar' ? 'فوائد صحية' : 'Health Benefits'}
          </h2>
          <div className="green-divider max-w-[100px] mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className={`rounded-2xl p-6 ${
                tip.color === 'green'
                  ? 'glass-card-green'
                  : 'glass-card'
              }`}
            >
              <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-2xl ${
                tip.color === 'green' ? 'bg-green-100' : 'bg-gold-100'
              }`}>
                {tip.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${
                tip.color === 'green' ? 'text-green-700' : 'text-gold-700'
              }`}>
                {lang === 'ar' ? tip.titleAr : tip.titleEn}
              </h3>
              <p className="text-gold-600/60 text-sm leading-relaxed">
                {lang === 'ar' ? tip.descAr : tip.descEn}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
