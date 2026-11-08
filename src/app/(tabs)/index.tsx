import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { QuadraMap, type MapPin } from '@/components/QuadraMap';
import { CoachMarks } from '@/components/CoachMarks';
import { ListingCard } from '@/components/ListingCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SOSButton } from '@/components/SOSButton';
import { Chip, EmptyState } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { useNearbyListings } from '@/data/repositories/listings';
import { findItem, LISTING_CATEGORIES } from '@/features/catalog';
import { useSession } from '@/features/session/store';
import { useLocationStore } from '@/lib/location';
import { colors, EASY_MODE_SCALE, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

// Módulo 1 · Servicios de Proximidad. Diseño: design/pantallas/Main.dc.html
export default function CercaDeTiScreen() {
  const coords = useLocationStore((s) => s.coords);
  const source = useLocationStore((s) => s.source);
  const easy = useSession((s) => s.easyMode);
  const [walkOnly, setWalkOnly] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'mapa' | 'lista'>('mapa');

  const { data: items = [], loading } = useNearbyListings({ from: coords, category, walkOnly, search });

  const pins: MapPin[] = useMemo(
    () =>
      items.slice(0, 40).map((l) => {
        const c = findItem(LISTING_CATEGORIES, l.category);
        return { id: l.id, lat: l.lat, lng: l.lng, color: c.color, icon: c.icon, label: l.title, onPress: () => router.push(`/listing/${l.id}`) };
      }),
    [items],
  );

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.zoneRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <AppText color={colors.textSecondary}>Lince · Sector 3{source === 'demo' ? ' (demo)' : ''}</AppText>
          </View>
          <AppText variant="hero" bold accessibilityRole="header">
            Cerca de ti
          </AppText>
        </View>
        <SOSButton />
      </View>

      <OfflineBanner compact />

      <View style={styles.search}>
        <Ionicons name="search" size={24} color={colors.inkSoft} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="¿Qué necesitas? Gasfitero, lasañas…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Buscar servicios y productos"
          style={[styles.searchInput, { fontSize: fontSize.base * (easy ? EASY_MODE_SCALE : 1) }]}
          returnKeyType="search"
        />
        {search ? (
          <Pressable accessibilityLabel="Borrar búsqueda" onPress={() => setSearch('')} style={{ padding: spacing.sm }}>
            <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <MicButton onText={(t) => setSearch(t.replace(/^(busco|necesito|quiero)\s+(un|una)?\s*/i, ''))} label="Buscar con tu voz" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="A pie · 1.5 km" icon="walk" selected={walkOnly} onPress={() => setWalkOnly(!walkOnly)} />
        {LISTING_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(category === c.key ? null : c.key)} />
        ))}
      </ScrollView>

      {mode === 'mapa' ? (
        <View>
          <QuadraMap center={coords} user={coords} pins={pins} zoom={walkOnly ? 14.5 : 13.5} />
          <ModeToggle mode={mode} onChange={setMode} floating />
        </View>
      ) : (
        <ModeToggle mode={mode} onChange={setMode} />
      )}

      <AppText bold color={colors.inkSoft}>
        {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
        {walkOnly ? ' a pie' : ''}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => <ListingCard item={item} />}
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="search-outline"
              text={walkOnly ? 'No hay resultados a pie. Toca "A pie · 1.5 km" para buscar en todo el distrito.' : 'No encontramos resultados.'}
            />
          )
        }
      />
      <CoachMarks />
    </SafeAreaView>
  );
}

function ModeToggle({ mode, onChange, floating }: { mode: 'mapa' | 'lista'; onChange: (m: 'mapa' | 'lista') => void; floating?: boolean }) {
  return (
    <View style={[styles.toggle, floating && styles.toggleFloating]} accessibilityRole="tablist">
      {(['mapa', 'lista'] as const).map((m) => (
        <Pressable
          key={m}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m }}
          accessibilityLabel={m === 'mapa' ? 'Ver mapa' : 'Ver lista'}
          onPress={() => onChange(m)}
          style={[styles.toggleBtn, mode === m && { backgroundColor: colors.primary }]}
        >
          <AppText bold color={mode === m ? colors.white : colors.primary}>
            {m === 'mapa' ? 'Mapa' : 'Lista'}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    padding: spacing.xs,
  },
  searchInput: { flex: 1, minHeight: MIN_TOUCH, fontFamily: fonts.regular, color: colors.ink },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  toggleFloating: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  toggleBtn: { minHeight: MIN_TOUCH - 4, paddingHorizontal: spacing.xl, justifyContent: 'center' },
});
