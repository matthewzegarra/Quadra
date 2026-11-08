import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

// Modo Emergencia: pestañas (Tablero, Economía, Apoyo) + pantallas de SOS.
export default function EmergenciaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgEmergency } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recibido/[id]" />
    </Stack>
  );
}
