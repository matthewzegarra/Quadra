import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { QuadraMap, type MapPin } from '@/components/QuadraMap';
import { EmergencyHeader } from '@/components/EmergencyHeader';
import { distanceText } from '@/components/ListingCard';
import { ReportCard } from '@/components/ReportCard';
import { Card, Chip, EmptyState } from '@/components/ui';
import { createReport, useReports, useVulnerableNeighbors } from '@/data/repositories/emergency';
import { NEEDS, findItem } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { useLocationStore } from '@/lib/location';
import { sharePoint } from '@/lib/privacy';
import { colors, elevation, radius, spacing } from '@/theme/tokens';

// Tablero de Ayuda Humanitaria. Diseño: design/pantallas/Emergencia.dc.html
export default function TableroScreen() {
  const coords = useLocationStore((s) => s.coords);
  const me = useCurrentUserId();
  const [level, setLevel] = useState<number | null>(null);
  const { data: reports = [] } = useReports(coords);
  const visible = level == null ? reports : reports.filter((r) => r.priority === level);
  const { data: vulnerable = [] } = useVulnerableNeighbors(coords);

  const pins: MapPin[] = useMemo(() => {
    const out: MapPin[] = [];
    for (const r of visible) {
      if (r.status === 'resuelto') continue;
      const mine = r.author_id === me;
      const at = sharePoint(r, mine);
      const shape = mine ? undefined : ('zone' as const);
      const open = () => router.push({ pathname: '/emergencia/recibido/[id]', params: { id: r.id } });
      // El SOS va en su punto exacto (para que lo encuentren); lo demás, en burbuja de zona
      if (r.kind === 'sos') out.push({ id: r.id, ...at, color: colors.danger, text: 'SOS', pulse: true, onPress: open, label: 'SOS' });
      else if (r.kind === 'vulnerable') out.push({ id: r.id, ...at, color: colors.vulnerable, icon: 'person', shape: shape ?? 'diamond' });
      else if (r.kind === 'recurso_necesito' || r.kind === 'recurso_ofrezco')
        out.push({ id: r.id, ...at, color: colors.need, icon: findItem(NEEDS, r.need).icon, shape: shape ?? 'square' });
      else out.push({ id: r.id, ...at, color: colors.ok, icon: 'checkmark', shape });
    }
    if (level == null || level === 1) {
      for (const v of vulnerable) out.push({ id: `v-${v.id}`, lat: v.home_lat!, lng: v.home_lng!, color: colors.vulnerable, shape: 'zone', icon: 'person' });
    }
    return out;
  }, [visible, vulnerable, me, level]);

  const imOk = () =>
    Alert.alert('¿Avisar que estás bien?', 'Tus vecinos verán que estás bien. Llega por internet o por la red vecinal.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, estoy bien',
        onPress: async () => {
          const { peers } = await createReport({ kind: 'estoy_bien', description: 'Estoy bien' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Alert.alert('¡Listo!', peers > 0 ? `Enviado a ${peers} ${peers === 1 ? 'vecino cercano' : 'vecinos cercanos'} y a la nube.` : 'Guardado. Se envía apenas haya señal o un vecino cerca.');
        },
      },
    ]);

  const header = (
    <View style={{ gap: spacing.lg }}>
      {/* Ícono arriba y texto abajo: entra completo en cualquier ancho y con letra grande */}
      <View style={styles.bigRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Estoy bien"
          accessibilityHint="Avisa a tus vecinos que estás bien"
          onPress={imOk}
          style={({ pressed }) => [styles.big, { backgroundColor: colors.ok }, pressed && styles.bigPressed]}
        >
          <View style={styles.bigIcon}>
            <Ionicons name="checkmark" size={30} color={colors.white} />
          </View>
          <AppText bold variant="large" color={colors.white} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.bigLabel}>
            Estoy bien
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Necesito ayuda"
          accessibilityHint="Envía un SOS a tus vecinos"
          onPress={() => router.push('/emergencia/sos')}
          style={({ pressed }) => [styles.big, { backgroundColor: colors.danger }, pressed && styles.bigPressed]}
        >
          <View style={styles.bigIcon}>
            <Ionicons name="warning" size={28} color={colors.white} />
          </View>
          <AppText bold variant="large" color={colors.white} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.bigLabel}>
            Necesito ayuda
          </AppText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Chip label="Todo" tone="danger" selected={level == null} onPress={() => setLevel(null)} />
        <Chip label="Alta" tone="danger" selected={level === 1} onPress={() => setLevel(1)} />
        <Chip label="Media" tone="danger" selected={level === 2} onPress={() => setLevel(2)} />
        <Chip label="Baja" tone="danger" selected={level === 3} onPress={() => setLevel(3)} />
      </ScrollView>
      <QuadraMap center={coords} user={coords} pins={pins} zoom={14.8} />
      <View style={styles.legend}>
        <View style={styles.legendItems}>
          <Legend color={colors.danger} label="SOS (punto exacto)" />
          <Legend color={colors.vulnerable} label="Vecino vulnerable" diamond />
          <Legend color={colors.need} label="Recurso" square />
          <Legend color={colors.ok} label="Está bien" />
        </View>
        <View style={styles.legendNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
          <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
            Los círculos muestran la zona (~250 m), no la casa. Solo el SOS va exacto.
          </AppText>
        </View>
      </View>
      {vulnerable.map((v) => (
        <Card key={v.id} borderColor={colors.vulnerable}>
          <View style={styles.vulnRow}>
            <View style={styles.vulnIcon}>
              <Ionicons name="person" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText bold variant="large">
                {v.display_name} · vive solo
              </AppText>
              <AppText color={colors.textSecondary}>Sin reporte todavía · {distanceText(v.distance_m).split(' · ')[0].toLowerCase()} · ¿Puedes ir a verlo?</AppText>
            </View>
          </View>
        </Card>
      ))}
      {visible.length > 0 ? (
        <AppText bold variant="large" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
          Reportes cerca de ti
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={styles.safe}>
      <EmergencyHeader title="Tablero de Ayuda Humanitaria" />
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => <ReportCard r={item} />}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" text="Aún no hay reportes. Avisa si estás bien o si necesitas ayuda." />}
      />
    </View>
  );
}

function Legend({ color, label, diamond, square }: { color: string; label: string; diamond?: boolean; square?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          { width: 16, height: 16, backgroundColor: color, borderRadius: 8 },
          diamond && { borderRadius: 2, transform: [{ rotate: '45deg' }] },
          square && { borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink },
        ]}
      />
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgEmergency },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  bigRow: { flexDirection: 'row', gap: spacing.md },
  big: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.lg + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    ...elevation(2),
  },
  bigPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  bigIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bigLabel: { textAlign: 'center', alignSelf: 'stretch' },
  legend: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm },
  legendNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  vulnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vulnIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.vulnerable, alignItems: 'center', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
