import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import MacroBar from '../../components/MacroBar';
import { getDayTotals } from '../../lib/database';
import { loadProfile, loadAdvice, saveAdvice } from '../../lib/storage';
import { getDailyAdvice } from '../../lib/claude';
import { todayString, formatDate } from '../../lib/nutrition';
import { UserProfile, DayTotals } from '../../lib/types';

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totals, setTotals] = useState<DayTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const today = todayString();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const p = await loadProfile();
    setProfile(p);
    const t = getDayTotals(today);
    setTotals(t);
    const cached = await loadAdvice(today);
    if (cached) {
      setAdvice(cached);
    }
  }

  async function refreshAdvice() {
    if (!profile) return;
    setLoadingAdvice(true);
    try {
      const a = await getDailyAdvice(totals, profile);
      setAdvice(a);
      await saveAdvice(today, a);
    } catch {
      setAdvice('No se pudo cargar el consejo. Verifica tu conexión.');
    } finally {
      setLoadingAdvice(false);
    }
  }

  const calPct = profile ? Math.min(totals.calories / profile.daily_calories, 1) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hola, {profile?.name || 'Campeón'} 💪
            </Text>
            <Text style={styles.date}>{formatDate(today)}</Text>
          </View>
          <View style={styles.goalBadge}>
            <Ionicons name="trending-up" size={14} color={Colors.primary} />
            <Text style={styles.goalText}>Subir peso</Text>
          </View>
        </View>

        {!profile && (
          <View style={styles.alertCard}>
            <Ionicons name="information-circle" size={20} color={Colors.calories} />
            <Text style={styles.alertText}>
              Completa tu perfil para ver tus metas nutricionales.
            </Text>
          </View>
        )}

        {/* Calories Card */}
        <View style={styles.caloriesCard}>
          <View style={styles.caloriesRow}>
            <View>
              <Text style={styles.caloriesNumber}>
                {Math.round(totals.calories)}
              </Text>
              <Text style={styles.caloriesLabel}>kcal consumidas</Text>
            </View>
            <View style={styles.caloriesRight}>
              {profile && (
                <>
                  <Text style={styles.caloriesTarget}>/{profile.daily_calories} kcal</Text>
                  <Text style={[
                    styles.caloriesRemain,
                    { color: totals.calories < profile.daily_calories ? Colors.primary : Colors.danger }
                  ]}>
                    {totals.calories < profile.daily_calories
                      ? `${Math.round(profile.daily_calories - totals.calories)} restantes`
                      : 'Meta alcanzada!'}
                  </Text>
                </>
              )}
            </View>
          </View>
          {profile && (
            <View style={styles.caloriesTrack}>
              <View style={[styles.caloriesFill, { width: `${calPct * 100}%` as any }]} />
            </View>
          )}
        </View>

        {/* Macros */}
        {profile && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Macronutrientes</Text>
            <MacroBar
              label="Proteína"
              current={totals.protein}
              target={profile.daily_protein}
              color={Colors.protein}
            />
            <MacroBar
              label="Carbohidratos"
              current={totals.carbs}
              target={profile.daily_carbs}
              color={Colors.carbs}
            />
            <MacroBar
              label="Grasas"
              current={totals.fat}
              target={profile.daily_fat}
              color={Colors.fat}
            />
          </View>
        )}

        {/* AI Advice */}
        <View style={styles.card}>
          <View style={styles.adviceHeader}>
            <View style={styles.adviceTitleRow}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle} > Consejo de hoy</Text>
            </View>
            <TouchableOpacity onPress={refreshAdvice} disabled={loadingAdvice || !profile}>
              <Ionicons
                name="refresh"
                size={18}
                color={profile ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          {loadingAdvice ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.sm }} />
          ) : advice ? (
            <Text style={styles.adviceText}>{advice}</Text>
          ) : (
            <TouchableOpacity onPress={refreshAdvice} disabled={!profile}>
              <Text style={styles.advicePlaceholder}>
                {profile
                  ? 'Toca el botón para obtener tu consejo personalizado de nutrición.'
                  : 'Completa tu perfil para recibir consejos.'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats row */}
        {profile && (
          <View style={styles.statsRow}>
            <StatCard label="Peso" value={`${profile.weight} kg`} icon="barbell" />
            <StatCard label="Meta cal." value={`${profile.daily_calories}`} icon="flame" />
            <StatCard label="Prot. meta" value={`${profile.daily_protein}g`} icon="fish" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greeting: { color: Colors.textPrimary, fontSize: Fonts.xxl, fontWeight: '700' },
  date: { color: Colors.textSecondary, fontSize: Fonts.sm, marginTop: 2, textTransform: 'capitalize' },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  goalText: { color: Colors.primary, fontSize: Fonts.xs, fontWeight: '700' },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.calories + '22',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  alertText: { color: Colors.calories, fontSize: Fonts.sm, flex: 1 },
  caloriesCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  caloriesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.sm },
  caloriesNumber: { color: Colors.textPrimary, fontSize: Fonts.xxxl, fontWeight: '800' },
  caloriesLabel: { color: Colors.textSecondary, fontSize: Fonts.sm },
  caloriesRight: { alignItems: 'flex-end' },
  caloriesTarget: { color: Colors.textSecondary, fontSize: Fonts.md },
  caloriesRemain: { fontSize: Fonts.sm, fontWeight: '600', marginTop: 2 },
  caloriesTrack: {
    height: 8,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  caloriesFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  adviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  adviceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adviceText: { color: Colors.textSecondary, fontSize: Fonts.md, lineHeight: 22 },
  advicePlaceholder: { color: Colors.textMuted, fontSize: Fonts.sm, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: Fonts.xs },
});
