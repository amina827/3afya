'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { recipes } from '@/data/recipes';
import { Recipe, RecipeCategory } from '@/types';
import { RecipeCard } from './RecipeCard';

const categories: { key: RecipeCategory; labelKey: string }[] = [
  { key: 'all', labelKey: 'recipes.all' },
  { key: 'frying', labelKey: 'recipes.frying' },
  { key: 'salad', labelKey: 'recipes.salad' },
  { key: 'baking', labelKey: 'recipes.baking' },
  { key: 'sauces', labelKey: 'recipes.sauces' },
];

interface RecipeGridProps {
  onSelectRecipe: (recipe: Recipe) => void;
}

export function RecipeGrid({ onSelectRecipe }: RecipeGridProps) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('all');

  const filtered = activeCategory === 'all'
    ? recipes
    : recipes.filter((r) => r.category === activeCategory);

  return (
    <div>
      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-gold-gradient text-white shadow-md shadow-gold-600/20'
                : 'glass-card text-gold-700 hover:border-gold-400'
            }`}
          >
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((recipe, index) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            index={index}
            onSelect={onSelectRecipe}
          />
        ))}
      </motion.div>
    </div>
  );
}
