import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';

interface Props {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, current, target, color, unit = 'g' }: Props) {
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const over = current > target && target > 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && { color: Colors.danger }]}>
          {Math.round(current)}<Text style={styles.target}>/{target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%` as any, backgroundColor: over ? Colors.danger : color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: Colors.textSecondary, fontSize: Fonts.sm },
  value: { color: Colors.textPrimary, fontSize: Fonts.sm, fontWeight: '600' },
  target: { color: Colors.textSecondary, fontWeight: '400' },
  track: {
    height: 6,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.full },
});
