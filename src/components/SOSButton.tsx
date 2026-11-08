import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { openLocalEmergency } from '@/data/repositories/emergency';
import { colors, elevation, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

/** Botón SOS siempre visible en el header: abre el Modo Emergencia en este celular. */
export function SOSButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="SOS"
      accessibilityHint="Pide ayuda urgente a tus vecinos, aunque no haya internet"
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        router.push('/emergencia/sos');
        void openLocalEmergency();
      }}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
    >
      <Ionicons name="warning-outline" size={28} color={colors.white} />
      <AppText bold variant="large" color={colors.white}>
        SOS
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    ...elevation(2),
  },
});
