'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { Recipe } from '@/types';

interface RecipeDetailProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  const { t, lang } = useLanguage();

  return (
    <AnimatePresence>
      {recipe && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-gold-900/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gold-50 rounded-t-3xl sm:rounded-3xl border border-gold-300/40 shadow-2xl"
          >
            {/* Golden header */}
            <div className="sticky top-0 bg-gold-50/95 backdrop-blur-sm p-6 pb-4 border-b border-gold-300/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{recipe.image}</span>
                  <div>
                    <h2 className="text-gold-700 text-xl font-bold">
                      {lang === 'ar' ? recipe.titleAr : recipe.titleEn}
                    </h2>
                    <p className="text-gold-600/60 text-sm">
                      {lang === 'ar' ? recipe.descriptionAr : recipe.descriptionEn}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gold-500 hover:text-gold-700 text-2xl leading-none p-1"
                >
                  ×
                </button>
              </div>

              {/* Meta badges */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full bg-gold-200 text-gold-700">
                  ⏱ {recipe.prepTime} {t('recipes.min')}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gold-200 text-gold-700">
                  🔥 {recipe.cookTime} {t('recipes.min')}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  👥 {recipe.servings} {t('recipes.servings')}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  🫒 {recipe.oilAmount} {t('scanner.ml')}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Ingredients - golden themed */}
              <div>
                <h3 className="text-gold-700 font-bold text-sm mb-3">
                  {t('recipes.ingredients')}
                </h3>
                <div className="gold-divider mb-3" />
                <ul className="space-y-2">
                  {(lang === 'ar' ? recipe.ingredientsAr : recipe.ingredientsEn).map(
                    (ing, i) => (
                      <li
                        key={i}
                        className="text-gold-800 text-sm flex items-start gap-2"
                      >
                        <span className="text-gold-500 mt-0.5">•</span>
                        {ing}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Steps - golden numbered */}
              <div>
                <h3 className="text-gold-700 font-bold text-sm mb-3">
                  {t('recipes.steps')}
                </h3>
                <div className="gold-divider mb-3" />
                <ol className="space-y-3">
                  {(lang === 'ar' ? recipe.stepsAr : recipe.stepsEn).map(
                    (step, i) => (
                      <li
                        key={i}
                        className="text-gold-800 text-sm flex items-start gap-3"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold-gradient text-white flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    )
                  )}
                </ol>
              </div>

              {/* Oil tip - green themed */}
              <div className="glass-card-green rounded-xl p-4">
                <h3 className="text-green-700 font-bold text-sm mb-2">
                  💡 {t('recipes.oilTip')}
                </h3>
                <div className="green-divider mb-2" />
                <p className="text-green-600 text-sm">
                  {lang === 'ar' ? recipe.oilTipAr : recipe.oilTipEn}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full bg-gold-gradient text-white rounded-xl py-3 font-medium text-sm shadow-md shadow-gold-600/20 hover:shadow-lg transition-all"
              >
                {t('recipes.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
