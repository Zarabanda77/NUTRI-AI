import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import FoodCard from '../../components/FoodCard';
import { getFoodEntriesByDate, getDayTotals } from '../../lib/database';
import { todayString, formatDate } from '../../lib/nutrition';
import { FoodEntry, DayTotals, MEAL_LABELS } from '../../lib/types';

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function DiaryScreen() {
  const [date, setDate] = useState(todayString());
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [totals, setTotals] = useState<DayTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [date])
  );

  function reload() {
    setEntries(getFoodEntriesByDate(date));
    setTotals(getDayTotals(date));
  }

  function prevDay() { setDate(d => offsetDate(d, -1)); }
  function nextDay() {
    const next = offsetDate(date, 1);
    if (next <= todayString()) setDate(next);
  }

  const isToday = date === todayString();
  const mealTypes: FoodEntry['meal_type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Date nav */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText} numberOfLines={1}>
            {isToday ? 'Hoy' : formatDate(date)}
          </Text>
        </View>
        <TouchableOpacity onPress={nextDay} style={styles.navBtn} disabled={isToday}>
          <Ionicons name="chevron-forward" size={22} color={isToday ? Colors.textMuted : Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Totals bar */}
      <View style={styles.totalsBar}>
        <TotalPill label="kcal" value={Math.round(totals.calories)} color={Colors.calories} />
        <TotalPill label="Prot" value={Math.round(totals.protein)} color={Colors.protein} unit="g" />
        <TotalPill label="Carb" value={Math.round(totals.carbs)} color={Colors.carbs} unit="g" />
        <TotalPill label="Gras" value={Math.round(totals.fat)} color={Colors.fat} unit="g" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin registros</Text>
            <Text style={styles.emptyText}>
              {isToday
                ? 'Usa la pestaña "Analizar" para registrar tus comidas.'
                : 'No hay comidas registradas para este día.'}
            </Text>
          </View>
        ) : (
          mealTypes.map((mt) => {
            const group = entries.filter((e) => e.meal_type === mt);
            if (group.length === 0) return null;
            return (
              <View key={mt} style={styles.mealGroup}>
                <Text style={styles.mealGroupTitle}>{MEAL_LABELS[mt]}</Text>
                {group.map((entry) => (
                  <FoodCard key={entry.id} entry={entry} onDelete={reload} />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TotalPill({
  label,
  value,
  color,
  unit = '',
}: {
  label: string;
  value: number;
  color: string;
  unit?: string;
}) {
  return (
    <View style={styles.totalPill}>
      <Text style={[styles.totalValue, { color }]}>{value}{unit}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBtn: { padding: Spacing.xs },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateText: {
    color: Colors.textPrimary,
    fontSize: Fonts.lg,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  totalsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalPill: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: Fonts.lg, fontWeight: '800' },
  totalLabel: { color: Colors.textMuted, fontSize: Fonts.xs },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
  mealGroup: { marginBottom: Spacing.lg },
  mealGroupTitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: Fonts.xl, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: Fonts.md, textAlign: 'center', lineHeight: 22 },
});
