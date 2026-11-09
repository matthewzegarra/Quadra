import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BackHeader, Badge, Card, EmptyState, Field, Notice, Segmented } from '@/components/ui';
import { moderateItem, usePendingReviews, useRecentEmergency, type PendingItem, type PublishedEmergency } from '@/data/repositories/moderation';
import { REPORT_KINDS, timeAgo } from '@/features/catalog';
import type { ReportKind } from '@/data/types';
import { colors, spacing } from '@/theme/tokens';

// Panel de la junta vecinal (moderadores).
// - Día a día (servicios y favores): esperan aprobación antes de salir al mapa.
// - Emergencia: sale al instante (una vida puede depender de eso). Aquí se ocultan después los falsos.
const LABEL = { listing: 'Servicio', favor: 'Favor', emergency_report: 'Emergencia' } as const;

type Tab = 'pendientes' | 'emergencia';

export default function ModerarScreen() {
  const { data: pending = [] } = usePendingReviews();
  const { data: recent = [] } = useRecentEmergency();
  const [tab, setTab] = useState<Tab>('pendientes');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Junta vecinal" />
        <AppText variant="hero" bold accessibilityRole="header">
          Revisión
        </AppText>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pendientes', label: `Por aprobar · ${pending.length}` },
            { value: 'emergencia', label: `Emergencia · ${recent.length}` },
          ]}
        />

        {tab === 'pendientes' ? (
          <>
            <Notice text="Servicios y favores no salen al mapa de la zona hasta que un moderador los aprueba. Así evitamos estafas y desinformación." />
            {pending.length === 0 ? <EmptyState icon="checkmark-circle-outline" title="Todo al día" text="No hay nada pendiente de aprobar." /> : null}
            {pending.map((item) => (
              <ReviewCard key={`${item.entity}-${item.id}`} item={item} />
            ))}
          </>
        ) : (
          <>
            <Notice
              tone="info"
              icon="flash-outline"
              text="Los avisos de emergencia salen al instante: un SOS no puede esperar. Si ves uno falso o de broma, ocúltalo y desaparece del tablero de todos."
            />
            {recent.length === 0 ? <EmptyState icon="shield-checkmark-outline" title="Sin avisos" text="No hay avisos de emergencia en las últimas 24 horas." /> : null}
            {recent.map((item) => (
              <EmergencyCard key={item.id} item={item} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewCard({ item }: { item: PendingItem }) {
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  if (done) return null;
  const decide = (decision: 'aprobado' | 'rechazado') => {
    Alert.alert(decision === 'aprobado' ? '¿Publicar?' : '¿Rechazar?', item.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: decision === 'aprobado' ? 'Aprobar' : 'Rechazar',
        style: decision === 'rechazado' ? 'destructive' : 'default',
        onPress: async () => {
          await moderateItem(item, decision, reason);
          setDone(true);
        },
      },
    ]);
  };
  return (
    <Card>
      <Badge label={LABEL[item.entity]} color={colors.primary} bg={colors.primarySoft} />
      <AppText bold variant="large">
        {item.title}
      </AppText>
      <AppText color={colors.textSecondary}>{item.detail}</AppText>
      <Field label="Motivo (opcional)" value={reason} onChangeText={setReason} placeholder="Corto y claro" />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <BigButton label="Aprobar" icon="checkmark" onPress={() => decide('aprobado')} />
        </View>
        <View style={{ flex: 1 }}>
          <BigButton label="Rechazar" icon="close" tone="outline" onPress={() => decide('rechazado')} />
        </View>
      </View>
    </Card>
  );
}

function EmergencyCard({ item }: { item: PublishedEmergency }) {
  const [hidden, setHidden] = useState(false);
  const k = REPORT_KINDS[item.kind as ReportKind] ?? REPORT_KINDS.sos;
  if (hidden) return null;
  const hide = () =>
    Alert.alert('¿Ocultar este aviso?', `“${item.title}” dejará de verse en el tablero de todos los vecinos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Ocultar',
        style: 'destructive',
        onPress: async () => {
          await moderateItem(item, 'rechazado', 'Aviso falso u ofensivo');
          setHidden(true);
        },
      },
    ]);
  return (
    <Card borderColor={item.kind === 'sos' ? colors.danger : undefined}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: k.color }]}>
          <Ionicons name={k.icon} size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText bold>{item.title}</AppText>
          <AppText variant="small" color={colors.textSecondary}>
            {item.detail} · {timeAgo(item.created_at)} · {item.origin === 'mesh' ? 'vía red vecinal' : 'vía internet'}
          </AppText>
        </View>
      </View>
      <BigButton label="Ocultar: es falso" icon="eye-off-outline" tone="outline" onPress={hide} />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
