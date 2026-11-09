import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { distanceText } from '@/components/ListingCard';
import { Badge, Card } from '@/components/ui';
import { setReportStatus, type ReportWithMeta } from '@/data/repositories/emergency';
import type { EmergencyReport } from '@/data/types';
import { findItem, firstName, NEEDS, PRIORITY_LABEL, REPORT_KINDS, timeAgo } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { colors, radius, spacing } from '@/theme/tokens';

export function reportTitle(r: EmergencyReport): string {
  if (r.kind === 'estoy_bien') return `${firstName(r.author_name)} está bien`;
  const need = r.need ? findItem(NEEDS, r.need).label.toLowerCase() : null;
  if (r.description) return r.description;
  if (r.kind === 'recurso_ofrezco') return `${firstName(r.author_name)} ofrece ${need ?? 'ayuda'}`;
  if (r.kind === 'recurso_necesito') return `${firstName(r.author_name)} necesita ${need ?? 'ayuda'}`;
  return `${firstName(r.author_name)} necesita ${need ?? 'ayuda'}`;
}

export function OriginPill({ r }: { r: EmergencyReport }) {
  if (r.origin === 'mesh') {
    const hops = r.mesh_hops ?? 1;
    return <Badge label={`Vía red vecinal · ${hops} ${hops === 1 ? 'salto' : 'saltos'}`} color={colors.ink} bg={colors.surfaceMuted} icon="bluetooth" />;
  }
  if (r.origin === 'sms') return <Badge label="Vía SMS" color={colors.ink} bg={colors.surfaceMuted} icon="mail-outline" />;
  return <Badge label="Vía internet" color={colors.ink} bg={colors.surfaceMuted} icon="cloud-outline" />;
}

export function ReportCard({ r }: { r: ReportWithMeta }) {
  const me = useCurrentUserId();
  const k = REPORT_KINDS[r.kind];
  const urgent = r.priority === 1 && r.status !== 'resuelto';
  const meta = [r.people_count && r.people_count > 1 ? `${r.people_count} personas` : null, distanceText(r.distance_m).split(' · ')[0].toLowerCase(), timeAgo(r.created_at)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card onPress={() => router.push({ pathname: '/emergencia/recibido/[id]', params: { id: r.id } })} label={`${reportTitle(r)}. ${meta}`} borderColor={urgent ? k.color : undefined}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: k.color }]}>
          <Ionicons name={k.icon} size={22} color={colors.white} />
        </View>
        <AppText bold variant="large" style={{ flex: 1 }}>
          {reportTitle(r)}
        </AppText>
        {r.kind !== 'estoy_bien' && r.kind !== 'recurso_ofrezco' ? (
          <Badge label={PRIORITY_LABEL[r.priority].toUpperCase()} color={colors.white} bg={r.priority === 1 ? colors.danger : colors.vulnerable} />
        ) : null}
      </View>
      <AppText color={colors.textSecondary}>{meta}</AppText>
      <View style={styles.row}>
        <OriginPill r={r} />
        {r.review_status === 'pendiente' ? <Badge label="Pendiente de confirmación" color={colors.accentInk} bg={colors.accent} icon="time-outline" /> : null}
        {r.status !== 'abierto' ? (
          <Badge label={r.status === 'atendiendo' ? 'Un vecino va en camino' : 'Resuelto'} color={colors.ok} bg={colors.primarySoft} icon="checkmark" />
        ) : null}
      </View>
      {r.status === 'abierto' && r.kind !== 'estoy_bien' && r.kind !== 'recurso_ofrezco' && r.author_id !== me ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Voy a ayudar" onPress={() => void setReportStatus(r.id, 'atendiendo')} style={styles.go}>
          <Ionicons name="heart-outline" size={22} color={colors.white} />
          <AppText bold color={colors.white}>
            Voy a ayudar
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  go: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.ok, borderRadius: radius.md, minHeight: 56 },
});
