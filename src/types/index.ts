export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  volume: number; // ml
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  caloriesPerMl: number;
  fatPerMl: number;
  vitaminEPerMl: number;
}

export interface OilResult {
  level: number; // 0-100 percentage
  remainingMl: number;
  consumedMl: number;
  daysRemaining: number;
  nutrition: NutritionInfo;
}

export interface NutritionInfo {
  calories: number;
  totalFat: number;
  saturatedFat: number;
  vitaminE: number;
}

export interface Recipe {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: RecipeCategory;
  oilAmount: number; // ml
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  rating: number;
  image: string;
  ingredientsAr: string[];
  ingredientsEn: string[];
  stepsAr: string[];
  stepsEn: string[];
  oilTipAr: string;
  oilTipEn: string;
}

export type RecipeCategory = 'all' | 'frying' | 'salad' | 'baking' | 'sauces';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: string | Translations;
}
