import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { closeLocalEmergency, deactivateZoneEmergency, useEmergencyMode } from '@/data/repositories/emergency';
import type { Profile } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { EMERGENCY_TYPES } from '@/features/catalog';
import { currentUserId } from '@/features/session/store';
import { useConnectivity } from '@/lib/connectivity';
import { useMesh } from '@/mesh/MeshRouter';
import { colors, radius, spacing } from '@/theme/tokens';

function minutesSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Header rojo del Modo Emergencia: "EMERGENCIA · SISMO · ACTIVA HACE 12 MIN" + estado de la red vecinal. */
export function EmergencyHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  const { official, type, startedAt } = useEmergencyMode();
  const peers = useMesh((s) => s.peers.filter((p) => p.connected).length);
  const meshOn = useMesh((s) => s.running);
  const meshError = useMesh((s) => s.error);
  const isOnline = useConnectivity((s) => s.isOnline);
  const { data: isAdmin } = useLocalQuery<boolean>(['profiles'], async (db) =>
    Boolean((await db.getFirstAsync<Profile>('SELECT is_zone_admin FROM profiles WHERE id = ?', [currentUserId()]))?.is_zone_admin),
  );
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const typeLabel = EMERGENCY_TYPES.find((t) => t.key === type)?.label ?? 'Emergencia';
  const mins = minutesSince(startedAt);
  const status = official
    ? `EMERGENCIA · ${typeLabel.toUpperCase()}${mins !== null ? ` · ACTIVA HACE ${mins} MIN` : ''}`
    : 'MODO EMERGENCIA · EN ESTE CELULAR';

  const exit = () => {
    if (official && !isAdmin) {
      Alert.alert('Emergencia activa', 'La junta vecinal activó el Modo Emergencia para todo el barrio. Se apagará cuando ellos lo indiquen.');
      return;
    }
    Alert.alert(official ? '¿Terminar la emergencia para todo el barrio?' : '¿Salir del Modo Emergencia?', '', [
      { text: 'Cancelar', style: 'cancel' },
      { text: official ? 'Terminar' : 'Salir', style: 'destructive', onPress: () => void (official ? deactivateZoneEmergency() : closeLocalEmergency()) },
    ]);
  };

  const meshText = !meshOn
    ? meshError
      ? `Red vecinal sin activar: ${meshError}`
      : 'Activando red vecinal…'
    : peers > 0
      ? `Red vecinal activa · ${peers} ${peers === 1 ? 'vecino conectado' : 'vecinos conectados'}`
      : 'Red vecinal activa · buscando vecinos…';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.statusRow}>
        <Ionicons name="warning-outline" size={20} color={colors.white} />
        <AppText bold variant="small" color={colors.white} style={{ flex: 1, letterSpacing: 0.5 }}>
          {status}
        </AppText>
        {official && !isAdmin ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="Salir del Modo Emergencia" onPress={exit} style={styles.exit}>
            <AppText bold variant="small" color={colors.white}>
              {official ? 'Terminar' : 'Salir'}
            </AppText>
          </Pressable>
        )}
      </View>
      <AppText variant="hero" bold color={colors.white} accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? <AppText color="#FAD4CF">{subtitle}</AppText> : null}
      <View style={styles.pills}>
        <View style={styles.pill}>
          <Ionicons name="bluetooth" size={18} color={colors.white} />
          <AppText bold variant="small" color={colors.white}>
            {meshText}
          </AppText>
        </View>
        {!isOnline ? (
          <View style={[styles.pill, { backgroundColor: colors.ink }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.white} />
            <AppText bold variant="small" color={colors.white}>
              Sin internet
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.danger, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exit: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#8E1B12', borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
});
