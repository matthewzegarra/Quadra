import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { setTaps } from '@/components/ClickCounter';
import { CoachMarks } from '@/components/CoachMarks';
import { ListingCard } from '@/components/ListingCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { QuadraMap, type MapPin } from '@/components/QuadraMap';
import { SOSButton } from '@/components/SOSButton';
import { Chip, EmptyState, IconTile, Notice } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { useNearbyListings } from '@/data/repositories/listings';
import { setDemoZone } from '@/data/repositories/profiles';
import { findItem, firstName, LISTING_CATEGORIES } from '@/features/catalog';
import { useCurrentUserId, useSession } from '@/features/session/store';
import { askLocationAgain, locationText, refreshLocation, useLocationStore } from '@/lib/location';
import { sharePoint } from '@/lib/privacy';
import { colors, EASY_MODE_SCALE, elevation, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

// Módulo 1 · Servicios de Proximidad. Diseño: design/pantallas/Main.dc.html
// Cabecera con la dirección REAL del vecino (como las apps de delivery): así sabe desde dónde se mide "a pie".
export default function CercaDeTiScreen() {
  const coords = useLocationStore((s) => s.coords);
  const easy = useSession((s) => s.easyMode);
  const name = useSession((s) => s.displayName);
  const me = useCurrentUserId();
  const [walkOnly, setWalkOnly] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'mapa' | 'lista'>('mapa');

  const { data: items = [], loading } = useNearbyListings({ from: coords, category, walkOnly, search });

  const pins: MapPin[] = useMemo(
    () =>
      items.slice(0, 40).map((l) => {
        const c = findItem(LISTING_CATEGORIES, l.category);
        const mine = l.owner_id === me;
        const at = sharePoint(l, mine);
        return {
          id: l.id,
          lat: at.lat,
          lng: at.lng,
          color: c.color,
          icon: c.icon,
          label: l.title,
          shape: mine ? ('circle' as const) : ('zone' as const),
          onPress: () => router.push(`/listing/${l.id}`),
        };
      }),
    [items, me],
  );

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <LocationPill />
          <SOSButton />
        </View>
        <View style={{ gap: 2 }}>
          {name ? (
            <AppText color={colors.accent} numberOfLines={1}>
              Hola, {firstName(name)}
            </AppText>
          ) : null}
          <AppText variant="hero" bold color={colors.white} accessibilityRole="header">
            Cerca de ti
          </AppText>
        </View>
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
      </View>

      <LocationNotices />
      <OfflineBanner compact />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="A pie · 1.5 km" icon="walk" selected={walkOnly} onPress={() => setWalkOnly(!walkOnly)} />
        <Chip label="Todo" selected={category === null} onPress={() => setCategory(null)} />
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
        {LISTING_CATEGORIES.map((c) => {
          const on = category === c.key;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={c.label}
              onPress={() => setCategory(on ? null : c.key)}
              style={({ pressed }) => [styles.cat, on && { borderColor: colors.primary, backgroundColor: c.bg }, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <IconTile icon={c.icon} color={c.color} bg={on ? colors.surface : c.bg} size={56} />
              <AppText bold variant="caption" style={{ textAlign: 'center' }} numberOfLines={2}>
                {c.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Reminders />

      {mode === 'mapa' ? (
        <View>
          <QuadraMap center={coords} user={coords} pins={pins} zoom={walkOnly ? 14.5 : 13.5} />
          <ModeToggle mode={mode} onChange={setMode} floating />
        </View>
      ) : (
        <ModeToggle mode={mode} onChange={setMode} />
      )}

      <View style={styles.resultsHead}>
        <AppText bold variant="large" style={{ flex: 1 }} accessibilityRole="header">
          {walkOnly ? 'A pie de ti' : 'En todo el distrito'}
        </AppText>
        <View style={styles.countPill}>
          <AppText bold variant="small" color={colors.primary}>
            {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
          </AppText>
        </View>
      </View>
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
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loading ? undefined : <NothingNearby walkOnly={walkOnly} searching={Boolean(search || category)} onWiden={() => setWalkOnly(false)} />}
      />
      <CoachMarks />
    </SafeAreaView>
  );
}

/** Dirección actual (toca para actualizar o ver el barrio demo). */
function LocationPill() {
  const loc = useLocationStore();
  const denied = loc.permission === 'denied' && loc.source !== 'gps' && !loc.simulateDemo;
  const text = denied ? 'Activa tu ubicación' : locationText(loc);

  const onPress = () => {
    if (denied) return void askLocationAgain();
    Alert.alert('Tu ubicación', loc.simulateDemo ? 'Estás viendo el barrio demo (Lince).' : `Desde aquí medimos lo que está “a pie”.\n${text}`, [
      { text: 'Cancelar', style: 'cancel' },
      loc.simulateDemo
        ? { text: 'Usar mi ubicación real', onPress: () => void setDemoZone(false) }
        : { text: 'Ver barrio demo', onPress: () => void setDemoZone(true) },
      { text: 'Actualizar', onPress: () => void refreshLocation() },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tu ubicación: ${text}`}
      accessibilityHint="Actualiza tu ubicación o cambia al barrio demo"
      onPress={onPress}
      style={({ pressed }) => [styles.locPill, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={denied ? 'location-outline' : loc.source === 'demo' ? 'flag-outline' : 'location'} size={22} color={colors.accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="caption" color={colors.accent}>
          {loc.source === 'gps' ? 'Estás en' : loc.source === 'last' ? 'Última ubicación' : denied ? 'Sin permiso' : 'Barrio de prueba'}
        </AppText>
        <AppText bold color={colors.white} numberOfLines={1}>
          {text}
        </AppText>
      </View>
      {loc.locating ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="chevron-down" size={20} color={colors.accent} />}
    </Pressable>
  );
}

/** Avisos de ubicación: sin permiso, o mirando el barrio demo. */
function LocationNotices() {
  const loc = useLocationStore();
  if (loc.simulateDemo) {
    return (
      <View style={styles.demoBar}>
        <Ionicons name="flag-outline" size={22} color={colors.accentInk} />
        <AppText variant="small" color={colors.accentInk} style={{ flex: 1 }}>
          Estás viendo el <AppText variant="small" bold color={colors.accentInk}>barrio demo (Lince)</AppText>.
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Usar mi ubicación real" onPress={() => void setDemoZone(false)} style={styles.demoBtn}>
          <AppText bold variant="small" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
            Usar la mía
          </AppText>
        </Pressable>
      </View>
    );
  }
  if (loc.permission === 'denied' && loc.source !== 'gps') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Notice
          tone="info"
          icon="location-outline"
          title="Activa tu ubicación"
          text="Así te mostramos lo que hay a pocas cuadras de tu casa. No la compartimos exacta con nadie."
        />
        <BigButton label="Activar ubicación" icon="locate-outline" tone="outline" onPress={() => void askLocationAgain()} />
      </View>
    );
  }
  return null;
}

/** Nada cerca: invitar a publicar, ampliar la búsqueda o ver el barrio demo. */
function NothingNearby({ walkOnly, searching, onWiden }: { walkOnly: boolean; searching: boolean; onWiden: () => void }) {
  const simulate = useLocationStore((s) => s.simulateDemo);
  if (searching) {
    return (
      <EmptyState icon="search-outline" title="Sin resultados" text={walkOnly ? 'No encontramos eso a pie. Prueba buscando en todo el distrito.' : 'No encontramos eso. Prueba con otra palabra.'}>
        {walkOnly ? <BigButton label="Buscar más lejos" icon="expand-outline" tone="outline" onPress={onWiden} /> : null}
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="storefront-outline"
      title="Tu cuadra aún está tranquila"
      text={walkOnly ? 'Todavía nadie ofrece algo a pie de ti. ¡Sé el primero de tu barrio!' : 'Todavía no hay publicaciones cerca. ¡Sé el primero de tu barrio!'}
    >
      <BigButton
        label="Ofrecer algo"
        icon="add-circle-outline"
        tone="accent"
        onPress={() => {
          setTaps(1);
          router.push('/publicar');
        }}
      />
      {walkOnly ? <BigButton label="Buscar más lejos" icon="expand-outline" tone="outline" onPress={onWiden} /> : null}
      {!simulate ? <BigButton label="Ver el barrio demo (Lince)" icon="flag-outline" tone="outline" onPress={() => void setDemoZone(true)} /> : null}
    </EmptyState>
  );
}

const REMINDERS = [
  { title: 'Saluda a un vecino', text: 'Una visita corta evita una emergencia.', icon: 'heart-outline' as const, bg: colors.primarySoft, fg: colors.primary },
  { title: 'Ten agua a mano', text: 'En un sismo, el agua es lo primero.', icon: 'water-outline' as const, bg: '#E1EBF7', fg: '#1E5AA8' },
  { title: 'Da tu Visto Bueno', text: 'Si usaste un servicio, recomiéndalo.', icon: 'checkmark-circle-outline' as const, bg: colors.accentSoft, fg: colors.accentInk },
];

function Reminders() {
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver novedades y Quadri Points"
        onPress={() => router.push('/novedades')}
        style={({ pressed }) => [styles.news, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.newsIcon}>
          <Ionicons name="paw" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText bold>Novedades y Quadri Points</AppText>
          <AppText variant="caption" color={colors.accentInk}>
            Ayudar suma. Pedir nunca resta.
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xl }}>
        {REMINDERS.map((r) => (
          <View key={r.title} style={styles.reminder}>
            <View style={[styles.reminderIcon, { backgroundColor: r.bg }]}>
              <Ionicons name={r.icon} size={24} color={r.fg} />
            </View>
            <AppText bold>{r.title}</AppText>
            <AppText variant="small" color={colors.textSecondary}>
              {r.text}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
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
          <Ionicons name={m === 'mapa' ? 'map-outline' : 'list'} size={20} color={mode === m ? colors.white : colors.primary} />
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
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120, gap: spacing.md },
  top: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg + 8,
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    ...elevation(2),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locPill: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    padding: spacing.xs,
  },
  searchInput: { flex: 1, minHeight: MIN_TOUCH, fontFamily: fonts.regular, color: colors.ink },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  cats: { gap: spacing.sm, paddingRight: spacing.xl },
  cat: {
    width: 96,
    minHeight: 112,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingTop: spacing.md,
  },
  news: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reminder: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  reminderIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  demoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: MIN_TOUCH,
  },
  demoBtn: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md },
  resultsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  countPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...elevation(2),
  },
  toggleFloating: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  toggleBtn: { minHeight: MIN_TOUCH - 4, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
