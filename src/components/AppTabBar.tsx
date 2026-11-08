import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { setTaps } from '@/components/ClickCounter';
import { openLocalEmergency } from '@/data/repositories/emergency';
import { colors, MIN_TOUCH, spacing } from '@/theme/tokens';

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
              <AppText variant="caption" bold>
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
              <Ionicons name={item.icon} size={28} color={colors.textSecondary} />
              <AppText variant="caption" bold color={colors.textSecondary}>
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
            <Ionicons name={active ? item.iconActive : item.icon} size={28} color={tint} />
            <AppText variant="caption" bold color={tint}>
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
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  item: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  publishCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
