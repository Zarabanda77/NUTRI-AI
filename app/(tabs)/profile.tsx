import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import { loadProfile, saveProfile } from '../../lib/storage';
import { calculateDailyTargets } from '../../lib/nutrition';
import { UserProfile } from '../../lib/types';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [saved, setSaved] = useState(false);
  const [targets, setTargets] = useState<Pick<UserProfile, 'daily_calories' | 'daily_protein' | 'daily_carbs' | 'daily_fat'> | null>(null);

  useEffect(() => {
    loadProfile().then((p) => {
      if (p) {
        setName(p.name);
        setAge(String(p.age));
        setWeight(String(p.weight));
        setHeight(String(p.height));
        setGender(p.gender);
        setTargets({
          daily_calories: p.daily_calories,
          daily_protein: p.daily_protein,
          daily_carbs: p.daily_carbs,
          daily_fat: p.daily_fat,
        });
      }
    });
  }, []);

  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w > 0 && h > 0 && a > 0) {
      setTargets(calculateDailyTargets(w, h, a, gender));
    }
  }, [weight, height, age, gender]);

  async function handleSave() {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!name.trim() || !w || !h || !a) {
      Alert.alert('Campos incompletos', 'Por favor completa todos los campos.');
      return;
    }
    const t = calculateDailyTargets(w, h, a, gender);
    const profile: UserProfile = {
      name: name.trim(),
      age: a,
      weight: w,
      height: h,
      gender,
      ...t,
    };
    await saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>
            Completa tu información para calcular tus macros diarios personalizados.
          </Text>

          {/* Goal badge */}
          <View style={styles.goalCard}>
            <Ionicons name="trophy" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.goalTitle}>Meta: Subir de Peso</Text>
              <Text style={styles.goalDesc}>
                Calcularemos un superávit calórico de +500 kcal y alta proteína.
              </Text>
            </View>
          </View>

          {/* Gender */}
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderActive]}
              onPress={() => setGender('male')}
            >
              <Ionicons name="male" size={18} color={gender === 'male' ? '#000' : Colors.primary} />
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                Hombre
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderActive]}
              onPress={() => setGender('female')}
            >
              <Ionicons name="female" size={18} color={gender === 'female' ? '#000' : Colors.primary} />
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                Mujer
              </Text>
            </TouchableOpacity>
          </View>

          <Field label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" />
          <Field label="Edad (años)" value={age} onChange={setAge} placeholder="25" keyboardType="numeric" />
          <Field label="Peso (kg)" value={weight} onChange={setWeight} placeholder="70" keyboardType="decimal-pad" />
          <Field label="Altura (cm)" value={height} onChange={setHeight} placeholder="175" keyboardType="numeric" />

          {/* Targets preview */}
          {targets && (
            <View style={styles.targetsCard}>
              <Text style={styles.targetsTitle}>Tus macros diarios calculados</Text>
              <View style={styles.targetsGrid}>
                <TargetItem label="Calorías" value={`${targets.daily_calories} kcal`} color={Colors.calories} />
                <TargetItem label="Proteína" value={`${targets.daily_protein} g`} color={Colors.protein} />
                <TargetItem label="Carbos" value={`${targets.daily_carbs} g`} color={Colors.carbs} />
                <TargetItem label="Grasas" value={`${targets.daily_fat} g`} color={Colors.fat} />
              </View>
              <Text style={styles.targetsNote}>
                Basado en actividad moderada + 500 kcal de superávit para ganar masa.
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnSuccess]} onPress={handleSave}>
            <Ionicons name={saved ? 'checkmark-circle' : 'save'} size={20} color="#000" />
            <Text style={styles.saveBtnText}>{saved ? 'Guardado!' : 'Guardar Perfil'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        returnKeyType="done"
      />
    </View>
  );
}

function TargetItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.targetItem}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 60 },
  title: { color: Colors.textPrimary, fontSize: Fonts.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: Fonts.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  goalCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  goalTitle: { color: Colors.primary, fontSize: Fonts.md, fontWeight: '700' },
  goalDesc: { color: Colors.textSecondary, fontSize: Fonts.sm, marginTop: 2 },
  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
  },
  genderActive: { backgroundColor: Colors.primary },
  genderText: { color: Colors.primary, fontWeight: '600', fontSize: Fonts.md },
  genderTextActive: { color: '#000' },
  fieldWrap: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Fonts.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  targetsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  targetsTitle: { color: Colors.textPrimary, fontSize: Fonts.md, fontWeight: '700', marginBottom: Spacing.md },
  targetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  targetItem: {
    width: '47%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  targetValue: { fontSize: Fonts.lg, fontWeight: '800' },
  targetLabel: { color: Colors.textSecondary, fontSize: Fonts.xs, marginTop: 2 },
  targetsNote: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: Spacing.sm, lineHeight: 16 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  saveBtnSuccess: { backgroundColor: '#00B266' },
  saveBtnText: { color: '#000', fontSize: Fonts.lg, fontWeight: '700' },
});
