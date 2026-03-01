'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onSelect: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, index, onSelect }: RecipeCardProps) {
  const { t, lang } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      onClick={() => onSelect(recipe)}
      className="glass-card rounded-2xl p-5 cursor-pointer hover:border-gold-400 hover:shadow-lg hover:shadow-gold-400/10 transition-all group"
    >
      {/* Image / Emoji */}
      <div className="text-5xl text-center mb-4 group-hover:scale-110 transition-transform">
        {recipe.image}
      </div>

      {/* Title */}
      <h3 className="text-gold-700 font-bold text-base mb-2 text-center">
        {lang === 'ar' ? recipe.titleAr : recipe.titleEn}
      </h3>

      {/* Description */}
      <p className="text-gold-600/50 text-xs text-center mb-4 line-clamp-2">
        {lang === 'ar' ? recipe.descriptionAr : recipe.descriptionEn}
      </p>

      {/* Meta info */}
      <div className="flex items-center justify-between text-[10px] text-gold-600">
        <span>⏱ {recipe.prepTime + recipe.cookTime} {t('recipes.min')}</span>
        <span>🫒 {recipe.oilAmount} {t('scanner.ml')}</span>
        <span className="text-gold-500">{'★'.repeat(Math.round(recipe.rating))}{'☆'.repeat(5 - Math.round(recipe.rating))}</span>
      </div>
    </motion.div>
  );
}
