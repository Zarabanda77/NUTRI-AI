import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import { getAnalysis, clearAnalysis } from '../lib/analysisStore';
import { addFoodEntry } from '../lib/database';
import { todayString } from '../lib/nutrition';
import { FoodEntry, MEAL_LABELS } from '../lib/types';

const MEAL_TYPES: FoodEntry['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS: Record<FoodEntry['meal_type'], any> = {
  breakfast: 'sunny',
  lunch: 'partly-sunny',
  dinner: 'moon',
  snack: 'cafe',
};

export default function AnalysisScreen() {
  const { analysis, imageUri } = getAnalysis();
  const [selectedMeal, setSelectedMeal] = useState<FoodEntry['meal_type']>('lunch');
  const [added, setAdded] = useState(false);

  // Editable fields
  const [foodName, setFoodName] = useState(analysis?.food_name ?? '');
  const [grams, setGrams] = useState(String(analysis?.grams ?? 100));
  const [calories, setCalories] = useState(String(analysis?.calories ?? 0));
  const [protein, setProtein] = useState(String(analysis?.protein ?? 0));
  const [carbs, setCarbs] = useState(String(analysis?.carbs ?? 0));
  const [fat, setFat] = useState(String(analysis?.fat ?? 0));

  // Base values (per gram) — used to recalculate when grams change
  const perGram = useRef({
    cal: (analysis?.calories ?? 0) / Math.max(analysis?.grams ?? 100, 1),
    prot: (analysis?.protein ?? 0) / Math.max(analysis?.grams ?? 100, 1),
    carb: (analysis?.carbs ?? 0) / Math.max(analysis?.grams ?? 100, 1),
    fat: (analysis?.fat ?? 0) / Math.max(analysis?.grams ?? 100, 1),
  });

  useEffect(() => {
    if (!analysis) router.back();
  }, [analysis]);

  if (!analysis) return null;

  function handleGramsChange(g: string) {
    const cleaned = g.replace(/[^0-9.]/g, '');
    setGrams(cleaned);
    const newGrams = parseFloat(cleaned) || 0;
    setCalories(String(Math.round(perGram.current.cal * newGrams)));
    setProtein(String(Math.round(perGram.current.prot * newGrams)));
    setCarbs(String(Math.round(perGram.current.carb * newGrams)));
    setFat(String(Math.round(perGram.current.fat * newGrams)));
  }

  // When user manually edits a macro, update its per-gram ratio so future grams changes use the new value
  function handleMacroChange(
    setter: (v: string) => void,
    key: 'cal' | 'prot' | 'carb' | 'fat'
  ) {
    return (v: string) => {
      const cleaned = v.replace(/[^0-9.]/g, '');
      setter(cleaned);
      const g = parseFloat(grams) || 1;
      perGram.current[key] = (parseFloat(cleaned) || 0) / g;
    };
  }

  function handleAdd() {
    addFoodEntry({
      date: todayString(),
      meal_type: selectedMeal,
      food_name: foodName.trim() || 'Comida',
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      image_uri: imageUri || undefined,
      created_at: new Date().toISOString(),
    });
    setAdded(true);
    clearAnalysis();
    setTimeout(() => router.back(), 800);
  }

  function handleRetake() {
    clearAnalysis();
    router.back();
  }

  const confidenceColor =
    analysis.confidence === 'high'
      ? Colors.primary
      : analysis.confidence === 'medium'
      ? Colors.carbs
      : Colors.danger;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleRetake} style={styles.backBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Resultado</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '22' }]}>
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                {analysis.confidence === 'high' ? 'Alta precisión' : analysis.confidence === 'medium' ? 'Media' : 'Estimado'}
              </Text>
            </View>
          </View>

          {/* Image */}
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            </View>
          ) : null}

          {/* Edit notice */}
          <View style={styles.editNotice}>
            <Ionicons name="create-outline" size={14} color={Colors.primary} />
            <Text style={styles.editNoticeText}>
              Cambia los gramos y todo se reescala automáticamente
            </Text>
          </View>

          {/* Food name */}
          <Text style={styles.fieldLabel}>Alimento</Text>
          <TextInput
            style={styles.foodNameInput}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="Nombre del alimento"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Grams - hero input */}
          <View style={styles.gramsCard}>
            <View style={styles.gramsHeader}>
              <Ionicons name="scale-outline" size={18} color={Colors.primary} />
              <Text style={styles.gramsLabel}>Peso de la porción</Text>
            </View>
            <View style={styles.gramsRow}>
              <TextInput
                style={styles.gramsInput}
                value={grams}
                onChangeText={handleGramsChange}
                keyboardType="decimal-pad"
                selectTextOnFocus
                maxLength={6}
              />
              <Text style={styles.gramsUnit}>gramos</Text>
            </View>
            <Text style={styles.gramsHint}>{analysis.serving_size}</Text>
          </View>

          {/* Macro inputs */}
          <View style={styles.macroGrid}>
            <MacroInput
              label="Calorías"
              value={calories}
              onChange={handleMacroChange(setCalories, 'cal')}
              unit="kcal"
              color={Colors.calories}
              icon="flame"
            />
            <MacroInput
              label="Proteína"
              value={protein}
              onChange={handleMacroChange(setProtein, 'prot')}
              unit="g"
              color={Colors.protein}
              icon="fish"
            />
            <MacroInput
              label="Carbohidratos"
              value={carbs}
              onChange={handleMacroChange(setCarbs, 'carb')}
              unit="g"
              color={Colors.carbs}
              icon="leaf"
            />
            <MacroInput
              label="Grasas"
              value={fat}
              onChange={handleMacroChange(setFat, 'fat')}
              unit="g"
              color={Colors.fat}
              icon="water"
            />
          </View>

          {/* AI Advice */}
          <View style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.adviceTitle}>Consejo IA</Text>
            </View>
            <Text style={styles.adviceText}>{analysis.advice}</Text>
          </View>

          {/* Meal type selector */}
          <Text style={styles.sectionLabel}>¿Cuándo fue esta comida?</Text>
          <View style={styles.mealGrid}>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[styles.mealBtn, selectedMeal === mt && styles.mealBtnActive]}
                onPress={() => setSelectedMeal(mt)}
              >
                <Ionicons
                  name={MEAL_ICONS[mt]}
                  size={18}
                  color={selectedMeal === mt ? '#000' : Colors.primary}
                />
                <Text style={[styles.mealBtnText, selectedMeal === mt && styles.mealBtnTextActive]}>
                  {MEAL_LABELS[mt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.addBtn, added && styles.addBtnSuccess]}
            onPress={handleAdd}
            disabled={added}
          >
            <Ionicons name={added ? 'checkmark-circle' : 'add-circle'} size={22} color="#000" />
            <Text style={styles.addBtnText}>{added ? 'Agregado!' : 'Agregar al Diario'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
            <Ionicons name="camera" size={18} color={Colors.primary} />
            <Text style={styles.retakeBtnText}>Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroInput({
  label,
  value,
  onChange,
  unit,
  color,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  color: string;
  icon: any;
}) {
  return (
    <View style={[styles.macroCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={18} color={color} />
      <TextInput
        style={[styles.macroValue, { color }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        selectTextOnFocus
        maxLength={5}
      />
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.xl, fontWeight: '700' },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  confidenceText: { fontSize: Fonts.xs, fontWeight: '700' },
  imageWrap: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
  },
  image: { width: '100%', height: '100%' },
  editNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  editNoticeText: { color: Colors.primary, fontSize: Fonts.xs, fontWeight: '600' },
  fieldLabel: {
    color: Colors.textMuted,
    fontSize: Fonts.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  foodNameInput: {
    color: Colors.textPrimary,
    fontSize: Fonts.xxl,
    fontWeight: '800',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gramsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary + '44',
  },
  gramsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  gramsLabel: { color: Colors.primary, fontSize: Fonts.sm, fontWeight: '700' },
  gramsRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  gramsInput: {
    color: Colors.textPrimary,
    fontSize: Fonts.xxxl,
    fontWeight: '800',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    minWidth: 130,
    textAlign: 'center',
  },
  gramsUnit: { color: Colors.textSecondary, fontSize: Fonts.lg, fontWeight: '600' },
  gramsHint: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 4 },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  macroCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  macroValue: {
    fontSize: Fonts.xxl,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  macroUnit: { color: Colors.textSecondary, fontSize: Fonts.sm },
  macroLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  adviceCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  adviceTitle: { color: Colors.primary, fontSize: Fonts.sm, fontWeight: '700' },
  adviceText: { color: Colors.textSecondary, fontSize: Fonts.md, lineHeight: 22 },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  mealBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealBtnText: { color: Colors.primary, fontWeight: '600', fontSize: Fonts.sm },
  mealBtnTextActive: { color: '#000' },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addBtnSuccess: { backgroundColor: '#00B266' },
  addBtnText: { color: '#000', fontSize: Fonts.lg, fontWeight: '700' },
  retakeBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retakeBtnText: { color: Colors.primary, fontSize: Fonts.md, fontWeight: '600' },
});
