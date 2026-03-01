'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { OilResult } from '@/types';
import { NutritionGauge } from './NutritionGauge';

interface ResultsDisplayProps {
  result: OilResult;
  onReset: () => void;
}

export function ResultsDisplay({ result, onReset }: ResultsDisplayProps) {
  const { t, lang } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="max-w-md mx-auto mt-6"
    >
      {/* Oil Level Gauge */}
      <div className="glass-card rounded-2xl p-6 text-center mb-4">
        <h3 className="text-gold-700 font-bold text-lg mb-1">
          {t('detect.oilLevel')}
        </h3>
        <div className="gold-divider max-w-[60px] mx-auto mb-4" />
        <NutritionGauge
          value={result.level}
          size={160}
          label={t('detect.oilLevel')}
          color={result.level > 50 ? '#48BB78' : result.level > 20 ? '#D4A017' : '#E53E3E'}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card stat-card rounded-xl p-4 text-center"
        >
          <p className="text-gold-600 text-[10px] mb-1">{t('detect.remaining')}</p>
          <p className="text-gold-700 text-xl font-bold">{result.remainingMl}</p>
          <p className="text-gold-500 text-[10px]">{t('scanner.ml')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card stat-card rounded-xl p-4 text-center"
        >
          <p className="text-gold-600 text-[10px] mb-1">{t('detect.consumed')}</p>
          <p className="text-gold-800 text-xl font-bold">{result.consumedMl}</p>
          <p className="text-gold-500 text-[10px]">{t('scanner.ml')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-green stat-card-green rounded-xl p-4 text-center"
        >
          <p className="text-green-600 text-[10px] mb-1">{t('detect.daysLeft')}</p>
          <p className="text-green-600 text-xl font-bold">{result.daysRemaining}</p>
          <p className="text-green-500 text-[10px]">📅</p>
        </motion.div>
      </div>

      {/* Nutrition panel - green themed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card-green rounded-2xl p-6 mb-4"
      >
        <h3 className="text-green-700 font-bold text-sm mb-2">
          🥗 {t('detect.nutrition')}
        </h3>
        <div className="green-divider mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between items-center py-2 border-b border-green-200/50">
            <span className="text-green-600 text-sm">{t('detect.calories')}</span>
            <span className="text-green-700 font-bold text-sm">
              {result.nutrition.calories.toLocaleString()} {t('detect.kcal')}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-green-200/50">
            <span className="text-green-600 text-sm">{t('detect.totalFat')}</span>
            <span className="text-green-700 font-bold text-sm">
              {result.nutrition.totalFat} {t('detect.gram')}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-green-200/50">
            <span className="text-green-600 text-sm">{t('detect.saturatedFat')}</span>
            <span className="text-green-700 font-bold text-sm">
              {result.nutrition.saturatedFat} {t('detect.gram')}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-green-200/50">
            <span className="text-green-600 text-sm">{t('detect.vitaminE')}</span>
            <span className="text-green-700 font-bold text-sm">
              {result.nutrition.vitaminE} {t('detect.mg')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Health tip banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass-card rounded-xl p-4 mb-4 flex items-center gap-3"
      >
        <div className="oil-drop" style={{ width: 32, height: 32, flexShrink: 0 }} />
        <p className="text-gold-600 text-xs leading-relaxed">
          {lang === 'ar'
            ? '💡 نصيحة: زيت عافية غني بفيتامين E ومضادات الأكسدة لصحة أفضل'
            : '💡 Tip: Afia oil is rich in Vitamin E and antioxidants for better health'}
        </p>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Link href="/recipes" className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gold-gradient text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-gold-600/20"
          >
            📖 {t('detect.viewRecipes')}
          </motion.button>
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="flex-1 bg-green-btn text-white rounded-xl py-3 font-medium text-sm shadow-md shadow-green-500/20"
        >
          🔄 {t('detect.tryAnother')}
        </motion.button>
      </div>
    </motion.div>
  );
}
