import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BackHeader, Card } from '@/components/ui';
import type { Profile } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { useCurrentUserId } from '@/features/session/store';
import { DEMO_ZONE_ID } from '@/lib/zone';
import { colors, radius, spacing } from '@/theme/tokens';

const QUADRI = require('../../assets/brand/quadri-mascota.png');

const REASON: Record<string, string> = {
  favor_completado: 'completó una ayuda',
  ofrecio_ayuda: 'ofreció ayuda',
  visto_bueno_recibido: 'recibió un Visto Bueno',
  respondio_emergencia: 'respondió en una emergencia',
};

type Activity = { id: string; name: string; reason: string; delta: number };

export default function NovedadesScreen() {
  const me = useCurrentUserId();
  const { data } = useLocalQuery(['profiles', 'ayni_ledger'], async (db) => {
    const top = await db.getAllAsync<Profile>(
      `SELECT * FROM profiles WHERE zone_id = ? OR zone_id IS NULL ORDER BY aynis DESC LIMIT 3`,
      [DEMO_ZONE_ID],
    );
    const activity = await db.getAllAsync<Activity>(
      `SELECT l.id, COALESCE(p.display_name, 'Un vecino') AS name, l.reason, l.delta
       FROM ayni_ledger l LEFT JOIN profiles p ON p.id = l.user_id
       ORDER BY COALESCE(l.updated_at, l.created_at) DESC LIMIT 8`,
    );
    const mine = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ayni_ledger WHERE user_id = ? AND reason = 'favor_completado'`,
      [me],
    );
    return { top, activity, helps: mine?.n ?? 0 };
  }, [me]);

  const top = data?.top ?? [];
  const helps = data?.helps ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Novedades" />
        <AppText variant="hero" bold accessibilityRole="header">
          Quienes más ayudan
        </AppText>
        <AppText color={colors.textSecondary}>Los Quadri Points se ganan ayudando. Pedir nunca resta.</AppText>

        <View style={styles.podium}>
          {top.map((p, i) => (
            <View key={p.id} style={[styles.place, i === 0 && styles.first]}>
              <AppText bold variant="title" color={i === 0 ? colors.accentInk : colors.primary}>
                {i + 1}
              </AppText>
              <AppText bold numberOfLines={2} style={{ textAlign: 'center' }}>
                {p.display_name}
              </AppText>
              <AppText bold color={colors.accentInk}>
                {p.aynis}
              </AppText>
            </View>
          ))}
        </View>
        {top.length === 0 ? <AppText color={colors.textSecondary}>Todavía no hay puntos en la cuadra.</AppText> : null}

        {helps >= 3 ? (
          <Card borderColor={colors.accent}>
            <Image source={QUADRI} style={styles.quadri} resizeMode="contain" accessibilityLabel="Quadri te saluda" />
            <AppText bold variant="large">
              Quadri está orgulloso
            </AppText>
            <AppText color={colors.textSecondary}>Ayudaste a {helps} vecinos. Hoy te ayudo, mañana me ayudas.</AppText>
          </Card>
        ) : (
          <Card>
            <Image source={QUADRI} style={styles.quadri} resizeMode="contain" accessibilityLabel="Quadri, la mascota de Quadra" />
            <AppText bold>Quadri te acompaña</AppText>
            <AppText color={colors.textSecondary}>Cuando completes 3 ayudas, Quadri te lo celebra aquí.</AppText>
          </Card>
        )}

        <AppText bold variant="large" accessibilityRole="header">
          En la cuadra
        </AppText>
        {(data?.activity ?? []).length === 0 ? <AppText color={colors.textSecondary}>Aún no hay actividad.</AppText> : null}
        {(data?.activity ?? []).map((a) => (
          <AppText key={a.id}>
            {a.name} {REASON[a.reason] ?? 'sumó puntos'} · +{a.delta}
          </AppText>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
  podium: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  place: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: 4,
  },
  first: { minHeight: 150, backgroundColor: colors.accent, borderColor: colors.accent },
  quadri: { width: 120, height: 140, alignSelf: 'center' },
});
