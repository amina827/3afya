'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { RecipeGrid } from '@/components/recipes/RecipeGrid';
import { RecipeDetail } from '@/components/recipes/RecipeDetail';
import { Recipe } from '@/types';

export default function RecipesPage() {
  const { t } = useLanguage();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  return (
    <div className="min-h-screen bg-green-gradient py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-shimmer text-3xl font-bold mb-2">
            {t('recipes.title')}
          </h1>
        </motion.div>

        <RecipeGrid onSelectRecipe={setSelectedRecipe} />
        <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      </div>
    </div>
  );
}
