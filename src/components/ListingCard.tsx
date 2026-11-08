import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card, IconTile } from '@/components/ui';
import type { ListingWithMeta } from '@/data/repositories/listings';
import { findItem, LISTING_CATEGORIES } from '@/features/catalog';
import { blocks, formatMeters, walkingMinutes } from '@/lib/geo';
import { colors, spacing } from '@/theme/tokens';

export function distanceText(m: number): string {
  // Cerca: en cuadras (como hablan los vecinos); lejos: en metros/km
  const where = m < 1000 ? `A ${blocks(m)} ${blocks(m) === 1 ? 'cuadra' : 'cuadras'}` : `A ${formatMeters(m)}`;
  return `${where} · ${walkingMinutes(m)} min a pie`;
}

export function VistoBuenoBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.vb} accessibilityLabel={`Visto Bueno Vecinal: ${count} vecinos`}>
      <Ionicons name="checkmark" size={18} color={colors.primaryDark} />
      <AppText variant="small" bold color={colors.primaryDark}>
        Visto Bueno Vecinal · {count}
      </AppText>
    </View>
  );
}

export function ListingCard({ item }: { item: ListingWithMeta }) {
  const cat = findItem(LISTING_CATEGORIES, item.category);
  const meta = [distanceText(item.distance_m), item.price_hint, item.kind === 'producto' ? item.schedule : null].filter(Boolean).join(' · ');
  return (
    <Card onPress={() => router.push(`/listing/${item.id}`)} label={`${item.title}. ${meta}`}>
      <View style={styles.row}>
        <IconTile icon={cat.icon} color={cat.color} bg={cat.bg} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText bold variant="large" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText variant="small" color={colors.textSecondary}>
            {meta}
          </AppText>
          <VistoBuenoBadge count={item.visto_bueno_count} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  vb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: 2,
  },
});
