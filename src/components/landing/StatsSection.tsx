'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

const stats = [
  {
    valueAr: '+50K',
    valueEn: '50K+',
    labelAr: 'مستخدم نشط',
    labelEn: 'Active Users',
    icon: '👥',
    color: 'gold',
  },
  {
    valueAr: '+120K',
    valueEn: '120K+',
    labelAr: 'زجاجة تم مسحها',
    labelEn: 'Bottles Scanned',
    icon: '📱',
    color: 'green',
  },
  {
    valueAr: '+300',
    valueEn: '300+',
    labelAr: 'وصفة ذكية',
    labelEn: 'Smart Recipes',
    icon: '📖',
    color: 'gold',
  },
  {
    valueAr: '4.8',
    valueEn: '4.8',
    labelAr: 'تقييم المستخدمين',
    labelEn: 'User Rating',
    icon: '⭐',
    color: 'green',
  },
];

export function StatsSection() {
  const { lang } = useLanguage();

  return (
    <section className="py-16 px-4 bg-gold-50">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-6 text-center ${
                stat.color === 'green'
                  ? 'glass-card-green stat-card-green'
                  : 'glass-card stat-card'
              }`}
            >
              <span className="text-3xl block mb-2">{stat.icon}</span>
              <p className={`text-2xl md:text-3xl font-extrabold ${
                stat.color === 'green' ? 'text-green-600' : 'text-gold-600'
              }`}>
                {lang === 'ar' ? stat.valueAr : stat.valueEn}
              </p>
              <p className="text-gold-600/60 text-xs mt-1 font-medium">
                {lang === 'ar' ? stat.labelAr : stat.labelEn}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
