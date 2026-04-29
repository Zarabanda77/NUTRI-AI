import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import { analyzeFood } from '../../lib/claude';
import { setAnalysis } from '../../lib/analysisStore';
import { OPENROUTER_API_KEY } from '../../lib/config';

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleAnalyze() {
    if (!imageUri) return;
    if (OPENROUTER_API_KEY.includes('PEGA-TU-KEY')) {
      Alert.alert(
        'API Key requerida',
        'Abre el archivo lib/config.ts y pega tu API key de OpenRouter.'
      );
      return;
    }
    setAnalyzing(true);
    try {
      // Resize and convert to JPEG to ensure compatibility with all AI providers
      // (iPhone fotos pueden ser HEIC y muy pesadas)
      const processed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64 = processed.base64 ?? await FileSystem.readAsStringAsync(processed.uri, {
        encoding: 'base64',
      });

      const result = await analyzeFood(base64);
      setAnalysis(result, imageUri);
      router.push('/analysis');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo analizar la imagen. Intenta con otra foto.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Analizar Alimento</Text>
        <Text style={styles.subtitle}>
          Toma una foto o elige de tu galería para calcular los valores nutricionales con IA
        </Text>

        {!imageUri ? (
          <View style={styles.placeholder}>
            <Ionicons name="camera" size={64} color={Colors.textMuted} />
            <Text style={styles.placeholderText}>Sin foto seleccionada</Text>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            {analyzing && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.analyzingText}>Analizando con IA...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.buttons}>
          {!imageUri ? (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={pickFromCamera}>
                <Ionicons name="camera" size={20} color="#000" />
                <Text style={styles.btnPrimaryText}>Tomar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnBarcode}
                onPress={() => router.push('/scan')}
              >
                <Ionicons name="barcode-outline" size={20} color="#000" />
                <Text style={styles.btnPrimaryText}>Escanear Código de Barras</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={pickFromGallery}>
                <Ionicons name="images" size={20} color={Colors.primary} />
                <Text style={styles.btnSecondaryText}>Elegir de Galería</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.btnPrimary, analyzing && styles.btnDisabled]}
                onPress={handleAnalyze}
                disabled={analyzing}
              >
                <Ionicons name="sparkles" size={20} color="#000" />
                <Text style={styles.btnPrimaryText}>
                  {analyzing ? 'Analizando...' : 'Analizar con IA'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setImageUri(null)}
                disabled={analyzing}
              >
                <Ionicons name="refresh" size={20} color={Colors.primary} />
                <Text style={styles.btnSecondaryText}>Cambiar Foto</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Mejores resultados</Text>
          <Text style={styles.tipItem}>• Buena iluminación</Text>
          <Text style={styles.tipItem}>• Todo el plato visible</Text>
          <Text style={styles.tipItem}>• Foto desde arriba (cenital)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.md },
  title: { color: Colors.textPrimary, fontSize: Fonts.xxl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: Fonts.sm, marginBottom: Spacing.lg, lineHeight: 20 },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  placeholderText: { color: Colors.textMuted, fontSize: Fonts.md },
  imageContainer: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.card,
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  analyzingText: { color: Colors.primary, fontSize: Fonts.lg, fontWeight: '700' },
  buttons: { gap: Spacing.sm, marginBottom: Spacing.md },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  btnBarcode: {
    backgroundColor: Colors.carbs,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  btnPrimaryText: { color: '#000', fontSize: Fonts.lg, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnSecondaryText: { color: Colors.primary, fontSize: Fonts.lg, fontWeight: '600' },
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  tipsTitle: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '700', marginBottom: 4 },
  tipItem: { color: Colors.textMuted, fontSize: Fonts.sm },
});
