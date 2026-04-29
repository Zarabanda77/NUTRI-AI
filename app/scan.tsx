import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import { lookupBarcode } from '../lib/openfoodfacts';
import { setAnalysis } from '../lib/analysisStore';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  async function handleBarcode({ data }: { data: string }) {
    // Synchronous lock to prevent double scans (camera fires this multiple times rapidly)
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const result = await lookupBarcode(data);
      setAnalysis(result, '');
      router.replace('/analysis');
    } catch (e: any) {
      Alert.alert(
        'No encontrado',
        e.message || 'Producto no encontrado. Intenta tomar una foto del plato.',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              lockRef.current = false;
              setScanned(false);
              setLoading(false);
            },
          },
          { text: 'Volver', onPress: () => router.back() },
        ]
      );
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Permiso de cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a la cámara para escanear códigos de barras.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Permitir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Escanear Código</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.middle}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Buscando producto...</Text>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          <Text style={styles.hint}>
            Apunta al código de barras del producto
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, color: '#fff', fontSize: Fonts.xl, fontWeight: '700', textAlign: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  loading: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: { color: '#fff', fontSize: Fonts.md, fontWeight: '600' },
  bottom: { padding: Spacing.lg, alignItems: 'center' },
  hint: {
    color: '#fff',
    fontSize: Fonts.md,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  permissionTitle: { color: Colors.textPrimary, fontSize: Fonts.xl, fontWeight: '700' },
  permissionText: { color: Colors.textSecondary, fontSize: Fonts.md, textAlign: 'center', lineHeight: 22 },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  btnText: { color: '#000', fontSize: Fonts.md, fontWeight: '700' },
  cancelText: { color: Colors.textSecondary, fontSize: Fonts.md, marginTop: Spacing.sm },
});
