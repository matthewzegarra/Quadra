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
import { colors, radius, spacing } from '@/theme/tokens';

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
      if (r.kind === 'sos') out.push({ id: r.id, ...at, color: colors.danger, text: 'SOS', pulse: mine, shape, onPress: open });
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
      <View style={styles.bigRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Estoy bien" onPress={imOk} style={[styles.big, { backgroundColor: colors.ok }]}>
          <Ionicons name="checkmark" size={34} color={colors.white} />
          <AppText bold variant="large" color={colors.white}>
            Estoy bien
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Necesito ayuda" onPress={() => router.push('/emergencia/sos')} style={[styles.big, { backgroundColor: colors.danger }]}>
          <Ionicons name="warning-outline" size={34} color={colors.white} />
          <AppText bold variant="large" color={colors.white}>
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
        <Legend color={colors.danger} label="SOS" />
        <Legend color={colors.vulnerable} label="Vecino vulnerable" diamond />
        <Legend color={colors.need} label="Recurso" square />
        <Legend color={colors.ok} label="Está bien" />
      </View>
      {vulnerable.map((v) => (
        <Card key={v.id} borderColor={colors.vulnerable}>
          <AppText bold variant="large">
            {v.display_name} · vive solo
          </AppText>
          <AppText color={colors.textSecondary}>Sin reporte todavía · {distanceText(v.distance_m).split(' · ')[0].toLowerCase()} · ¿Puedes ir a verlo?</AppText>
        </Card>
      ))}
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
  big: { flex: 1, minHeight: 96, borderRadius: radius.lg + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
