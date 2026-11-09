import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmergencyHeader } from '@/components/EmergencyHeader';
import { distanceText } from '@/components/ListingCard';
import { Card, IconTile } from '@/components/ui';
import { createReport, setReportStatus, useReports } from '@/data/repositories/emergency';
import type { ReportKind } from '@/data/types';
import { firstName, NEEDS } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { WALKING_RADIUS_M } from '@/lib/geo';
import { useLocationStore } from '@/lib/location';
import { colors, elevation, radius, spacing } from '@/theme/tokens';

// Economía Solidaria: coordinar y compartir recursos críticos. Diseño: design/pantallas/Economia.dc.html
const KINDS: ReportKind[] = ['recurso_necesito', 'recurso_ofrezco'];
const RESOURCES = NEEDS.filter((n) => n.key !== 'rescate');

export default function EconomiaScreen() {
  const coords = useLocationStore((s) => s.coords);
  const me = useCurrentUserId();
  const [mode, setMode] = useState<'necesito' | 'ofrezco'>('necesito');
  const { data: reports = [] } = useReports(coords, KINDS);

  const counts = useMemo(() => {
    const c: Record<string, { offer: number; need: number; urgent: number }> = {};
    for (const r of reports) {
      if (r.status === 'resuelto' || !r.need) continue;
      c[r.need] ??= { offer: 0, need: 0, urgent: 0 };
      if (r.kind === 'recurso_ofrezco') c[r.need].offer++;
      else {
        c[r.need].need++;
        if (r.priority === 1) c[r.need].urgent++;
      }
    }
    return c;
  }, [reports]);

  const offersNearby = reports.filter((r) => r.kind === 'recurso_ofrezco' && r.status !== 'resuelto' && r.distance_m <= WALKING_RADIUS_M);
  const needsNearby = reports.filter((r) => r.kind === 'recurso_necesito' && r.status !== 'resuelto' && r.distance_m <= WALKING_RADIUS_M);

  const publish = (need: string, label: string) => {
    const kind: ReportKind = mode === 'necesito' ? 'recurso_necesito' : 'recurso_ofrezco';
    Alert.alert(mode === 'necesito' ? `¿Necesitas ${label.toLowerCase()}?` : `¿Puedes ofrecer ${label.toLowerCase()}?`, 'Avisaremos a tus vecinos cercanos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Publicar',
        onPress: async () => {
          await createReport({ kind, need, description: `${mode === 'necesito' ? 'Necesito' : 'Ofrezco'} ${label.toLowerCase()}` });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        },
      },
    ]);
  };

  const list = mode === 'necesito' ? offersNearby : needsNearby;

  return (
    <View style={styles.safe}>
      <EmergencyHeader title="Economía Solidaria" subtitle="Compartamos lo que tenemos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggle} accessibilityRole="tablist">
          {(['necesito', 'ofrezco'] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => setMode(m)}
              style={[styles.toggleBtn, mode === m && { backgroundColor: colors.danger }]}
            >
              <AppText bold variant="large" color={mode === m ? colors.white : colors.danger}>
                {m === 'necesito' ? 'Necesito' : 'Puedo ofrecer'}
              </AppText>
            </Pressable>
          ))}
        </View>

        <AppText color={colors.textSecondary}>Toca un recurso para {mode === 'necesito' ? 'pedirlo' : 'ofrecerlo'}.</AppText>

        <View style={styles.grid}>
          {RESOURCES.map((n) => {
            const c = counts[n.key] ?? { offer: 0, need: 0, urgent: 0 };
            const hot = c.urgent > 0;
            return (
              <Pressable
                key={n.key}
                accessibilityRole="button"
                accessibilityLabel={`${n.label}. ${c.offer} ofrecen, ${c.need} necesitan`}
                onPress={() => publish(n.key, n.label)}
                style={({ pressed }) => [styles.tile, hot && { borderColor: colors.danger, borderWidth: 3 }, pressed && { transform: [{ scale: 0.98 }] }]}
              >
                <View style={styles.tileHead}>
                  <View style={[styles.tileIcon, { backgroundColor: n.bg }]}>
                    <Ionicons name={n.icon} size={24} color={n.color} />
                  </View>
                  <AppText bold variant="large" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flex: 1 }}>
                    {n.label}
                  </AppText>
                </View>
                <AppText variant="small">
                  <AppText variant="small" bold color={colors.ok}>
                    {n.key === 'energia' && c.offer ? `${c.offer} generador${c.offer > 1 ? 'es' : ''}` : `${c.offer} ${c.offer === 1 ? 'ofrece' : 'ofrecen'}`}
                  </AppText>
                  {' · '}
                  {hot ? (
                    <AppText variant="small" bold color={colors.danger}>
                      {c.urgent} urgente{c.urgent > 1 ? 's' : ''}
                    </AppText>
                  ) : (
                    `${c.need} ${c.need === 1 ? 'necesita' : 'necesitan'}`
                  )}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText bold variant="large" color={colors.inkSoft}>
          {mode === 'necesito' ? 'Ofrecen cerca de ti' : 'Necesitan cerca de ti'}
        </AppText>
        {list.length === 0 ? <AppText color={colors.textSecondary}>Nadie todavía.</AppText> : null}
        {list.map((r) => {
          const n = NEEDS.find((x) => x.key === r.need) ?? NEEDS[0];
          return (
            <Card key={r.id}>
              <View style={styles.offerRow}>
                <IconTile icon={n.icon} color={n.color} bg={n.bg} />
                <View style={{ flex: 1 }}>
                  <AppText bold>
                    {firstName(r.author_name)} · {n.label.toLowerCase()}
                  </AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    {r.description ?? ''} · {distanceText(r.distance_m).split(' · ')[0].toLowerCase()}
                  </AppText>
                </View>
                {r.author_id !== me && r.status === 'abierto' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Voy" onPress={() => void setReportStatus(r.id, 'atendiendo')} style={styles.go}>
                    <AppText bold color={colors.white}>
                      Voy
                    </AppText>
                  </Pressable>
                ) : r.status === 'atendiendo' ? (
                  <Ionicons name="checkmark-circle" size={28} color={colors.ok} />
                ) : null}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgEmergency },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  toggle: { flexDirection: 'row', borderWidth: 2, borderColor: colors.danger, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  toggleBtn: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '47%', flexGrow: 1, minHeight: 120, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, justifyContent: 'space-between', gap: spacing.sm, ...elevation(1) },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  go: { backgroundColor: colors.ok, borderRadius: radius.md, minHeight: 56, paddingHorizontal: spacing.xl, justifyContent: 'center' },
});
