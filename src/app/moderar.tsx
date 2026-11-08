import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BackHeader, Card, EmptyState, Field } from '@/components/ui';
import { moderateItem, usePendingReviews, type PendingItem } from '@/data/repositories/moderation';
import { colors, spacing } from '@/theme/tokens';

const LABEL = { listing: 'Servicio', favor: 'Favor', emergency_report: 'Emergencia' } as const;

export default function ModerarScreen() {
  const { data: items = [] } = usePendingReviews();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Revisión" />
        <AppText variant="hero" bold accessibilityRole="header">
          Por publicar
        </AppText>
        <AppText color={colors.textSecondary}>Nada sale al mapa de la zona hasta que la junta lo aprueba. Un SOS por Bluetooth igual llega al vecino cercano.</AppText>
        {items.length === 0 ? <EmptyState icon="checkmark-circle-outline" text="No hay nada pendiente." /> : null}
        {items.map((item) => (
          <ReviewCard key={`${item.entity}-${item.id}`} item={item} />
        ))}
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
      <AppText variant="small" bold color={colors.primary}>
        {LABEL[item.entity]}
      </AppText>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: spacing.sm },
});
