'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { OilBottleSlider } from '@/components/OilBottleSlider';
import { CupTargetInput } from '@/components/CupTargetInput';
import { useLanguage } from '@/hooks/useLanguage';

const TOTAL_ML = 1500;
const CUP_ML = 200;

export default function SliderPage() {
  const { lang } = useLanguage();
  const [currentMl, setCurrentMl] = useState<number>(TOTAL_ML);
  const [targetMl, setTargetMl] = useState<number | null>(null);

  const cupsRemaining = (currentMl / CUP_ML).toFixed(1);
  const targetCups = targetMl !== null ? (targetMl / CUP_ML).toFixed(1) : null;
  const targetReached = targetMl !== null && currentMl >= targetMl;
  const remainingToTarget = targetMl !== null ? Math.max(0, targetMl - currentMl) : null;

  const tips = [
    {
      icon: '👆',
      titleAr: 'اسحب لتعديل المستوى',
      titleEn: 'Drag to adjust level',
      descAr: 'اسحب الفقاعة للأعلى أو الأسفل لضبط كمية الزيت داخل الزجاجة.',
      descEn: 'Drag the bubble up or down to set the exact oil amount inside the bottle.',
    },
    {
      icon: '🥛',
      titleAr: 'كل كوب 200 مل',
      titleEn: 'Each cup is 200 ml',
      descAr: 'الزجاجة الكاملة (1500 مل) تساوي 7.5 أكواب تقريبًا.',
      descEn: 'A full bottle (1500 ml) is roughly equal to 7.5 cups.',
    },
    {
      icon: '✨',
      titleAr: 'دقة بخطوات 100 مل',
      titleEn: 'Snaps every 100 ml',
      descAr: 'يقفز السلايدر بخطوات 100 مل لتقدير سهل ودقيق.',
      descEn: 'The slider snaps in 100 ml steps for fast and accurate readings.',
    },
  ];

  return (
    <div className="min-h-screen bg-green-gradient py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-shimmer text-4xl md:text-5xl font-extrabold mb-3">
            {lang === 'ar' ? 'محسوب الزيت' : 'Oil Calculator'}
          </h1>
          <div className="gold-divider max-w-[80px] mx-auto mb-3" />
          <p className="text-gold-600/70 text-base md:text-lg">
            {lang === 'ar'
              ? 'حدد كمية الزيت اللي عندك بدقة'
              : 'Set your oil quantity precisely'}
          </p>
        </motion.div>

        {/* Main slider card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-card rounded-3xl p-6 mb-6"
        >
          <OilBottleSlider
            totalMl={TOTAL_ML}
            stepMl={100}
            cupMl={CUP_ML}
            initialMl={TOTAL_ML}
            onChange={setCurrentMl}
          />

          {/* State display */}
          <motion.div
            key={currentMl}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 text-center"
          >
            <div className="inline-flex flex-col items-center px-6 py-4 rounded-2xl bg-white/60 border border-gold-300/50 shadow-sm">
              <span className="text-gold-600/70 text-xs uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'المتبقي' : 'Remaining'}
              </span>
              <span className="text-shimmer text-2xl md:text-3xl font-bold">
                {lang === 'ar'
                  ? `عندك ${currentMl} مل = ${cupsRemaining} كوب`
                  : `You have ${currentMl} ml = ${cupsRemaining} cups remaining`}
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Target cup input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-4"
        >
          <CupTargetInput
            cupMl={CUP_ML}
            maxCups={7.5}
            currentMl={currentMl}
            onTargetChange={setTargetMl}
          />
        </motion.div>

        {/* Target progress feedback (when a target is set) */}
        {targetMl !== null && (
          <motion.div
            key={`target-${targetMl}-${targetReached}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 mb-6 text-center shadow-md ${
              targetReached
                ? 'bg-green-100 border border-green-300'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            {targetReached ? (
              <p className="text-green-700 font-bold text-sm">
                ✓{' '}
                {lang === 'ar'
                  ? `وصلت للهدف: ${targetCups} كوب`
                  : `Target reached: ${targetCups} cups`}
              </p>
            ) : (
              <p className="text-amber-700 font-bold text-sm">
                {lang === 'ar'
                  ? `تحتاج ${remainingToTarget} مل إضافية للوصول لـ ${targetCups} كوب`
                  : `Need ${remainingToTarget} more ml to reach ${targetCups} cups`}
              </p>
            )}
          </motion.div>
        )}

        {/* Tips section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-shimmer text-xl font-bold text-center mb-4">
            {lang === 'ar' ? 'نصائح للاستخدام' : 'How to use it'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tips.map((tip, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass-card rounded-2xl p-5 text-center"
              >
                <div className="text-4xl mb-3">{tip.icon}</div>
                <h3 className="text-gold-700 font-bold text-base mb-2">
                  {lang === 'ar' ? tip.titleAr : tip.titleEn}
                </h3>
                <p className="text-gold-600/70 text-sm leading-relaxed">
                  {lang === 'ar' ? tip.descAr : tip.descEn}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
