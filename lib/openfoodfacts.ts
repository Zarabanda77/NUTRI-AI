import { AnalysisResult } from './types';

// OpenFoodFacts: base de datos mundial de productos, gratis, sin API key
const API = 'https://world.openfoodfacts.org/api/v2/product';

export async function lookupBarcode(barcode: string): Promise<AnalysisResult> {
  const res = await fetch(`${API}/${barcode}.json`);
  if (!res.ok) throw new Error('Error de red al buscar producto');

  const data = await res.json();
  if (data.status === 0 || !data.product) {
    throw new Error('Producto no encontrado en la base de datos');
  }

  const p = data.product;
  const nutr = p.nutriments || {};

  // Los valores en OpenFoodFacts vienen por 100g
  const grams = 100;
  const calories = Math.round(
    nutr['energy-kcal_100g'] ||
    (nutr['energy_100g'] ? nutr['energy_100g'] / 4.184 : 0)
  );
  const protein = Math.round(nutr.proteins_100g || 0);
  const carbs = Math.round(nutr.carbohydrates_100g || 0);
  const fat = Math.round(nutr.fat_100g || 0);

  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    throw new Error('Producto sin información nutricional disponible');
  }

  const name =
    p.product_name_es ||
    p.product_name ||
    p.generic_name_es ||
    p.generic_name ||
    'Producto';
  const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';

  return {
    food_name: `${name}${brand}`.trim(),
    grams,
    calories,
    protein,
    carbs,
    fat,
    serving_size: `100g (datos del paquete)`,
    advice: 'Información nutricional oficial del producto. Ajusta los gramos a tu porción real.',
    confidence: 'high',
  };
}
