import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import { FoodEntry, MEAL_LABELS } from '../lib/types';
import { deleteFoodEntry } from '../lib/database';

interface Props {
  entry: FoodEntry;
  onDelete: () => void;
}

export default function FoodCard({ entry, onDelete }: Props) {
  function handleDelete() {
    Alert.alert('Eliminar', `¿Eliminar "${entry.food_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          if (entry.id) deleteFoodEntry(entry.id);
          onDelete();
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      {entry.image_uri ? (
        <Image source={{ uri: entry.image_uri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="restaurant" size={22} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{entry.food_name}</Text>
        <Text style={styles.meal}>{MEAL_LABELS[entry.meal_type]}</Text>
        <View style={styles.macros}>
          <Pill value={`${Math.round(entry.calories)} kcal`} color={Colors.calories} />
          <Pill value={`P: ${Math.round(entry.protein)}g`} color={Colors.protein} />
          <Pill value={`C: ${Math.round(entry.carbs)}g`} color={Colors.carbs} />
          <Pill value={`G: ${Math.round(entry.fat)}g`} color={Colors.fat} />
        </View>
      </View>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function Pill({ value, color }: { value: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      <Text style={[styles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    alignItems: 'center',
  },
  image: { width: 64, height: 64 },
  imagePlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: Spacing.sm },
  name: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '600', marginBottom: 2 },
  meal: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: 6 },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pillText: { fontSize: Fonts.xs, fontWeight: '600' },
  deleteBtn: { padding: Spacing.sm },
});
