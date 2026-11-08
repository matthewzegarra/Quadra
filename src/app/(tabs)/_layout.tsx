import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { AppTabBar } from '@/components/AppTabBar';
import { useEmergencyMode } from '@/data/repositories/emergency';
import { useSession } from '@/features/session/store';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const onboardingDone = useSession((s) => s.onboardingDone);
  const hasName = useSession((s) => Boolean(s.displayName));
  const { active } = useEmergencyMode();

  if (!onboardingDone) return <Redirect href="/tutorial" />;
  if (!hasName) return <Redirect href="/bienvenida" />;
  // La app "evoluciona": en emergencia toda la navegación cambia al Tablero de Ayuda Humanitaria
  if (active) return <Redirect href="/emergencia" />;

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Cerca de ti' }} />
      <Tabs.Screen name="favores" options={{ title: 'Cadena de Favores' }} />
      <Tabs.Screen name="publicar" options={{ title: 'Publicar' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
