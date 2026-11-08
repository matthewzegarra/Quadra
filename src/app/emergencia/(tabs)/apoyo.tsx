import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { EmergencyHeader } from '@/components/EmergencyHeader';
import { distanceText } from '@/components/ListingCard';
import { Card, EmptyState, IconTile } from '@/components/ui';
import { useNearbyListings } from '@/data/repositories/listings';
import { findItem, firstName, LISTING_CATEGORIES } from '@/features/catalog';
import { openWhatsApp, revealListingPhone } from '@/lib/contact';
import { useLocationStore } from '@/lib/location';
import { colors, spacing } from '@/theme/tokens';

// Directorio de apoyo: servicios y grupos disponibles ante emergencias (enfermera, electricista, generador, camioneta).
export default function ApoyoScreen() {
  const coords = useLocationStore((s) => s.coords);
  const { data: items = [], loading } = useNearbyListings({ from: coords, category: null, walkOnly: false, search: '', emergencyOnly: true });

  return (
    <View style={styles.safe}>
      <EmergencyHeader title="Directorio de apoyo" subtitle="Vecinos que pueden ayudar en la emergencia" />
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={loading ? undefined : <EmptyState icon="people-outline" text="Aún no hay vecinos registrados como apoyo en emergencias." />}
        renderItem={({ item }) => {
          const cat = findItem(LISTING_CATEGORIES, item.category);
          return (
            <Card onPress={() => router.push(`/listing/${item.id}`)} label={item.title}>
              <View style={styles.row}>
                <IconTile icon={cat.icon} color={cat.color} bg={cat.bg} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText bold variant="large">
                    {item.emergency_capability ?? cat.label}
                  </AppText>
                  <AppText color={colors.inkSoft}>{item.owner_name ?? item.title}</AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    {distanceText(item.distance_m)}
                  </AppText>
                </View>
              </View>
              <BigButton
                label={`Escribirle a ${firstName(item.owner_name)}`}
                icon="logo-whatsapp"
                onPress={async () => {
                  const phone = await revealListingPhone(item.id, item.whatsapp);
                  await openWhatsApp(phone, `¡Hola ${firstName(item.owner_name)}! Te escribo desde Quadra (Modo Emergencia). ¿Puedes ayudarnos? Necesitamos: ${item.emergency_capability ?? cat.label}.`);
                }}
              />
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgEmergency },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
});
