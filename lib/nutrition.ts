import { UserProfile } from './types';

export function calculateDailyTargets(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): Pick<UserProfile, 'daily_calories' | 'daily_protein' | 'daily_carbs' | 'daily_fat'> {
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * 1.55);
  const daily_calories = tdee + 500;
  const daily_protein = Math.round(weight * 2);
  const daily_fat = Math.round((daily_calories * 0.25) / 9);
  const daily_carbs = Math.round((daily_calories - daily_protein * 4 - daily_fat * 9) / 4);

  return { daily_calories, daily_protein, daily_carbs, daily_fat };
}

export function getProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(current / target, 1);
}

export function formatMacro(value: number, unit: string = 'g'): string {
  return `${Math.round(value)}${unit}`;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
