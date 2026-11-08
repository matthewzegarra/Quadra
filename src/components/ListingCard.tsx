import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Badge, Card, IconTile } from '@/components/ui';
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
  const when = item.kind === 'producto' ? item.schedule : null;
  const meta = [distanceText(item.distance_m), item.price_hint, when].filter(Boolean).join(' · ');
  return (
    <Card onPress={() => router.push(`/listing/${item.id}`)} label={`${item.title}. ${meta}`}>
      <View style={styles.row}>
        <IconTile icon={cat.icon} color={cat.color} bg={cat.bg} size={64} />
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="caption" bold color={cat.color}>
            {cat.label.toUpperCase()}
          </AppText>
          <AppText bold variant="large" numberOfLines={2}>
            {item.title}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="walk" size={18} color={colors.primary} />
            <AppText variant="small" bold color={colors.primary}>
              {distanceText(item.distance_m)}
            </AppText>
          </View>
          {item.price_hint || when ? (
            <View style={styles.tags}>
              {item.price_hint ? (
                <View style={styles.price}>
                  <AppText variant="small" bold color={colors.accentInk}>
                    {item.price_hint}
                  </AppText>
                </View>
              ) : null}
              {when ? (
                <AppText variant="small" color={colors.textSecondary} style={{ flexShrink: 1 }}>
                  {when}
                </AppText>
              ) : null}
            </View>
          ) : null}
          <VistoBuenoBadge count={item.visto_bueno_count} />
          {item.review_status === 'pendiente' ? <Badge label="Pendiente de revisión" color={colors.accentInk} bg={colors.accentSoft} icon="time-outline" /> : null}
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.borderStrong} style={{ alignSelf: 'center' }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  price: { backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
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
