import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { setTaps } from '@/components/ClickCounter';
import { openLocalEmergency } from '@/data/repositories/emergency';
import { colors, elevation, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

type Item =
  | { kind: 'tab'; route: string; label: string; icon: IconName; iconActive: IconName }
  | { kind: 'publish' }
  | { kind: 'link'; href: '/emergencia'; label: string; icon: IconName };

// Orden del diseño (design/capturas/Main.png): Cerca · Favores · [Publicar] · Emergencia · Perfil
const ITEMS: Item[] = [
  { kind: 'tab', route: 'index', label: 'Cerca', icon: 'location-outline', iconActive: 'location' },
  { kind: 'tab', route: 'favores', label: 'Favores', icon: 'heart-outline', iconActive: 'heart' },
  { kind: 'publish' },
  { kind: 'link', href: '/emergencia', label: 'Emergencia', icon: 'warning-outline' },
  { kind: 'tab', route: 'perfil', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
];

/** Etiquetas de la barra: una línea, se achican si no entran (pantallas angostas o letra grande). */
const LABEL = { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7, maxFontSizeMultiplier: 1 } as const;

/** Barra inferior con el botón central "Publicar" (toque 1 de 3). */
export function AppTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const goTab = (route: string) => {
    const target = state.routes.find((r) => r.name === route);
    if (target) navigateToTab(target.key);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {ITEMS.map((item) => {
        if (item.kind === 'publish') {
          return (
            <Pressable
              key="publicar"
              accessibilityRole="button"
              accessibilityLabel="Publicar"
              accessibilityHint="Abre las opciones para publicar en 3 toques"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setTaps(1); // toque 1 de 3
                goTab('publicar');
              }}
              style={styles.item}
            >
              <View style={styles.publishCircle}>
                <Ionicons name="add" size={40} color={colors.ink} />
              </View>
              <AppText variant="caption" bold {...LABEL}>
                Publicar
              </AppText>
            </Pressable>
          );
        }
        if (item.kind === 'link') {
          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint="Abre el Modo Emergencia: Tablero de Ayuda Humanitaria"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                void openLocalEmergency();
              }}
              style={styles.item}
            >
              <View style={styles.iconSlot}>
                <Ionicons name={item.icon} size={26} color={colors.danger} />
              </View>
              <AppText variant="caption" bold color={colors.danger} {...LABEL}>
                {item.label}
              </AppText>
            </Pressable>
          );
        }
        const active = activeName === item.route;
        const tint = active ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            key={item.route}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => goTab(item.route)}
            style={styles.item}
          >
            <View style={[styles.iconSlot, active && styles.iconSlotActive]}>
              <Ionicons name={active ? item.iconActive : item.icon} size={26} color={tint} />
            </View>
            <AppText variant="caption" bold color={tint} {...LABEL}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingTop: spacing.sm,
    ...elevation(3),
  },
  // Indicador del tab activo (pastilla detrás del ícono, estilo Material 3)
  iconSlot: { width: 60, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconSlotActive: { backgroundColor: colors.primarySoft },
  item: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: 2,
  },
  publishCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
    borderColor: colors.surface,
    ...elevation(2),
  },
});
