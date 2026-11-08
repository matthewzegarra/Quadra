import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { QuadraMap } from '@/components/QuadraMap';
import { BigButton } from '@/components/BigButton';
import { reportTitle } from '@/components/ReportCard';
import { Avatar, BackHeader, EmptyState } from '@/components/ui';
import { setReportStatus, useReport } from '@/data/repositories/emergency';
import { firstName, PRIORITY_LABEL, REPORT_KINDS, timeAgo } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { useConnectivity } from '@/lib/connectivity';
import { mapsLink, openSms } from '@/lib/contact';
import { distanceMeters, formatMeters } from '@/lib/geo';
import { useLocationStore } from '@/lib/location';
import { useMesh } from '@/mesh/MeshRouter';
import { colors, radius, spacing } from '@/theme/tokens';

// SOS recibido por red vecinal (sin internet). Diseño: design/pantallas/SOSRecibido.dc.html
export default function SOSRecibidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, loading } = useReport(id);
  const coords = useLocationStore((s) => s.coords);
  const isOnline = useConnectivity((s) => s.isOnline);
  const peers = useMesh((s) => s.peers.filter((p) => p.connected).length);
  const me = useCurrentUserId();

  if (!r) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.xl }}>
          <BackHeader />
          {!loading ? <EmptyState icon="alert-circle-outline" text="No encontramos este reporte." /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const k = REPORT_KINDS[r.kind];
  const d = distanceMeters(coords, r);
  const path: string[] = r.mesh_path ? (JSON.parse(r.mesh_path) as string[]) : [];
  const chain = r.origin === 'mesh' ? [...(path.length ? path : [firstName(r.author_name)]), 'Tú'] : [];
  const isSos = r.kind === 'sos' || r.kind === 'vulnerable';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/emergencia'))}
          right={
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              {!isOnline ? (
                <View style={[styles.pill, { backgroundColor: colors.ink }]}>
                  <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
                  <AppText bold variant="small" color={colors.white}>
                    Sin internet
                  </AppText>
                </View>
              ) : null}
              <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="bluetooth" size={16} color={colors.primaryDark} />
                <AppText bold variant="small" color={colors.primaryDark}>
                  Red vecinal · {peers} conectados
                </AppText>
              </View>
            </View>
          }
        />

        <View style={styles.hero}>
          <View style={[styles.halo, { backgroundColor: isSos ? '#F3CFCB' : colors.primarySoft }]}>
            <View style={[styles.alert, { backgroundColor: k.color }]}>
              <Ionicons name={k.icon} size={48} color={colors.white} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText bold variant="small" color={k.color} style={{ letterSpacing: 0.5 }}>
              {(r.kind === 'sos' ? 'SOS RECIBIDO' : k.label.toUpperCase()) + ' · ' + timeAgo(r.created_at).toUpperCase()}
            </AppText>
            <AppText variant="title" bold>
              {r.kind === 'estoy_bien' ? `${firstName(r.author_name)} está bien` : `${r.author_name ?? 'Un vecino'} ${r.kind === 'recurso_ofrezco' ? 'ofrece ayuda' : 'necesita ayuda'}`}
            </AppText>
          </View>
        </View>

        <View style={[styles.quote, { borderColor: k.color }]}>
          <AppText bold variant="large">
            “{reportTitle(r)}”
          </AppText>
          <View style={styles.stats}>
            <Stat label="Distancia" value={formatMeters(d)} />
            <Stat label="Personas" value={String(r.people_count ?? 1)} />
            <Stat label="Prioridad" value={PRIORITY_LABEL[r.priority]} color={r.priority === 1 ? colors.danger : undefined} />
          </View>
        </View>

        {chain.length > 1 ? (
          <View style={styles.chainBox}>
            <AppText bold color={colors.primaryDark}>
              Llegó de celular en celular, sin internet
            </AppText>
            <View style={styles.chain}>
              {chain.map((n, i) => (
                <View key={`${n}-${i}`} style={[styles.chainItem, i === 0 && { flex: 0 }]}>
                  {i > 0 ? <View style={styles.dash} /> : null}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    {n === 'Tú' ? (
                      <View style={styles.you}>
                        <AppText bold color={colors.white}>
                          Tú
                        </AppText>
                      </View>
                    ) : (
                      <Avatar name={n} size={52} color={i === 0 ? colors.accent : colors.surface} />
                    )}
                    <AppText bold variant="small">
                      {n === 'Tú' ? `${r.mesh_hops ?? chain.length - 1} saltos` : n}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
            <AppText variant="small" color={colors.primaryDark}>
              Apenas un vecino recupere señal, este aviso se sube a la nube para todos.
            </AppText>
          </View>
        ) : (
          <QuadraMap center={r} user={coords} pins={[{ id: r.id, lat: r.lat, lng: r.lng, color: k.color, text: r.kind === 'sos' ? 'SOS' : undefined, icon: k.icon, pulse: r.kind === 'sos' }]} zoom={15.5} style={{ height: 180 }} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isSos && r.status === 'abierto' && r.author_id !== me ? (
          <BigButton
            label="Voy a ayudar"
            icon="heart-outline"
            tone="ok"
            onPress={async () => {
              await setReportStatus(r.id, 'atendiendo');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }}
          />
        ) : r.status !== 'abierto' ? (
          <AppText bold color={colors.ok} style={{ textAlign: 'center' }}>
            {r.status === 'atendiendo' ? 'Un vecino va en camino' : 'Resuelto'}
          </AppText>
        ) : null}
        {r.author_id === me && r.status !== 'resuelto' ? (
          <BigButton label="Ya estoy bien · marcar resuelto" icon="checkmark-done" tone="ok" onPress={() => void setReportStatus(r.id, 'resuelto')} />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <BigButton label="Ver en mapa" icon="location-outline" tone="outline" onPress={() => Linking.openURL(mapsLink(r))} />
          </View>
          <View style={{ flex: 1 }}>
            <BigButton
              label="Enviar por SMS"
              icon="mail-outline"
              tone="outline"
              onPress={() => openSms(`SOS (Quadra): ${r.author_name ?? 'Un vecino'} necesita ayuda: ${reportTitle(r)}. ${r.people_count ?? 1} persona(s). ${mapsLink(r)}`)}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="small" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText bold variant="large" color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgEmergency },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  halo: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  alert: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  quote: { borderWidth: 2, borderRadius: radius.lg + 4, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: '#F4F1EA', borderRadius: radius.md, padding: spacing.md, gap: 2 },
  chainBox: { backgroundColor: colors.primarySoft, borderRadius: radius.lg + 4, padding: spacing.xl, gap: spacing.lg },
  chain: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chainItem: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  dash: { flex: 1, height: 0, borderTopWidth: 3, borderStyle: 'dashed', borderColor: colors.primary, marginTop: 26, marginHorizontal: 4 },
  you: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },
});
