import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClickCounter } from '@/components/ClickCounter';
import { useEmergencyMode } from '@/data/repositories/emergency';
import { bootstrap, useAppEffects } from '@/features/app/bootstrap';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppEffects() {
  useAppEffects();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  const [booted, setBooted] = useState(false);

  // Base local primero: la app nunca espera a la red para abrir.
  useEffect(() => {
    bootstrap()
      .catch((e) => console.warn('[bootstrap]', e))
      .finally(() => setBooted(true));
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && booted;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppEffects />
      <ThemedStatusBar />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)/tutorial" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(onboarding)/bienvenida" options={{ gestureEnabled: false }} />
          <Stack.Screen name="emergencia" />
          <Stack.Screen name="publicar/[tipo]" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="favor/[id]" />
          <Stack.Screen name="favor/ofrecer/[id]" />
          <Stack.Screen name="red-vecinal" />
        </Stack>
        <ClickCounter />
      </View>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { active } = useEmergencyMode();
  return <StatusBar style={active ? 'light' : 'dark'} />;
}
