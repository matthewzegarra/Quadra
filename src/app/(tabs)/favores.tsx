import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { FavorCard } from '@/components/FavorCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Chip, EmptyState } from '@/components/ui';
import { mobilityMatches, useFavors, useMyMobility } from '@/data/repositories/favors';
import type { FavorType, Profile } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { FAVOR_TYPES } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { useLocationStore } from '@/lib/location';
import { colors, radius, spacing } from '@/theme/tokens';

// Módulo 2 · Cadena de Favores (sin dinero). Diseño: design/pantallas/Favores.dc.html
const FILTERS: (FavorType | null)[] = [null, 'pido', 'presto', 'dono', 'intercambio', 'movilidad', 'ofrezco'];

export default function FavoresScreen() {
  const coords = useLocationStore((s) => s.coords);
  const me = useCurrentUserId();
  const [type, setType] = useState<FavorType | null>(null);
  const { data: items = [], loading } = useFavors({ from: coords, type });
  const { data: myMobility = [] } = useMyMobility();
  const { data: aynis } = useLocalQuery<number>(['profiles'], async (db) => (await db.getFirstAsync<Profile>('SELECT aynis FROM profiles WHERE id = ?', [me]))?.aynis ?? 0, [me]);

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.headRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="hero" bold accessibilityRole="header">
            Cadena de Favores
          </AppText>
          <AppText color={colors.textSecondary}>Ayuda y pide ayuda, sin dinero</AppText>
        </View>
        <View style={styles.aynis} accessibilityLabel={`Tienes ${aynis ?? 0} Quadri Points`}>
          <AppText bold variant="title" color={colors.accentInk}>
            {aynis ?? 0}
          </AppText>
          <AppText bold variant="small" color={colors.accentInk} style={{ textAlign: 'center' }}>
            Quadri Points
          </AppText>
        </View>
      </View>
      <OfflineBanner compact />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xl }}>
        {FILTERS.map((f) => (
          <Chip key={f ?? 'todo'} label={f ? FAVOR_TYPES[f].filter : 'Todo'} selected={type === f} onPress={() => setType(f)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const isMine = item.author_id === me;
          const match = !isMine && item.type === 'movilidad' ? myMobility.find((m) => mobilityMatches(m, item)) ?? null : null;
          return <FavorCard item={item} isMine={isMine} match={match} />;
        }}
        ListEmptyComponent={loading ? undefined : <EmptyState icon="heart-outline" text="Aún no hay favores aquí. ¡Sé el primero en publicar!" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Tarjeta de puntos: como máximo ~35 % del ancho para no aplastar el título/nombre
  aynis: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', maxWidth: '36%', flexShrink: 0 },
});
