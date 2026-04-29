export interface FoodEntry {
  id?: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_uri?: string;
  created_at: string;
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
}

export interface AnalysisResult {
  food_name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  advice: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MEAL_LABELS: Record<FoodEntry['meal_type'], string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};
