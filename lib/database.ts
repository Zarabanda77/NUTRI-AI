import * as SQLite from 'expo-sqlite';
import { FoodEntry, DayTotals } from './types';

let _db: SQLite.SQLiteDatabase | null = null;

function db(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('nutri-ai.db');
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS food_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        food_name TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        image_uri TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }
  return _db;
}

export function addFoodEntry(entry: Omit<FoodEntry, 'id'>): void {
  db().runSync(
    `INSERT INTO food_entries (date, meal_type, food_name, calories, protein, carbs, fat, image_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.date,
      entry.meal_type,
      entry.food_name,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fat,
      entry.image_uri ?? null,
      entry.created_at,
    ]
  );
}

export function getFoodEntriesByDate(date: string): FoodEntry[] {
  return db().getAllSync<FoodEntry>(
    'SELECT * FROM food_entries WHERE date = ? ORDER BY created_at ASC',
    [date]
  );
}

export function deleteFoodEntry(id: number): void {
  db().runSync('DELETE FROM food_entries WHERE id = ?', [id]);
}

export function getDayTotals(date: string): DayTotals {
  const result = db().getFirstSync<DayTotals>(
    `SELECT
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(protein), 0) as protein,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fat), 0) as fat
     FROM food_entries WHERE date = ?`,
    [date]
  );
  return result ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
}
