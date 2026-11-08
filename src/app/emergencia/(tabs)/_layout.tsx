import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useEmergencyMode } from '@/data/repositories/emergency';
import { colors, MIN_TOUCH, spacing } from '@/theme/tokens';

const TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'Tablero', icon: 'location-outline' },
  { name: 'economia', label: 'Economía Solidaria', icon: 'cube-outline' },
  { name: 'apoyo', label: 'Directorio de apoyo', icon: 'construct-outline' },
];

function EmergencyTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((t) => {
        const route = state.routes.find((r) => r.name === t.name);
        const selected = active === t.name;
        const tint = selected ? colors.danger : colors.inkSoft;
        return (
          <Pressable
            key={t.name}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected }}
            onPress={() => route && navigateToTab(route.key)}
            style={styles.item}
          >
            <Ionicons name={t.icon} size={28} color={tint} />
            <AppText variant="caption" bold color={tint} style={{ textAlign: 'center' }} numberOfLines={2} maxFontSizeMultiplier={1}>
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// La app "evoluciona": en emergencia la navegación cambia a estas 3 pestañas.
export default function EmergencyTabsLayout() {
  const { active } = useEmergencyMode();
  if (!active) return <Redirect href="/" />;
  return (
    <Tabs tabBar={(p) => <EmergencyTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgEmergency } }}>
      <Tabs.Screen name="index" options={{ title: 'Tablero de Ayuda Humanitaria' }} />
      <Tabs.Screen name="economia" options={{ title: 'Economía Solidaria' }} />
      <Tabs.Screen name="apoyo" options={{ title: 'Directorio de apoyo' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 3, borderTopColor: colors.danger, paddingTop: spacing.sm },
  item: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
});
