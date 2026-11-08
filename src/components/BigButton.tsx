import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

type Tone = 'primary' | 'accent' | 'danger' | 'ok' | 'outline';

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  hint?: string;
  disabled?: boolean;
};

const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  accent: { bg: colors.accent, fg: colors.ink },
  danger: { bg: colors.danger, fg: colors.white },
  ok: { bg: colors.ok, fg: colors.white },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.primary },
};

/** Botón principal a lo ancho: ícono + texto, mínimo 56 dp, háptica al tocar. */
export function BigButton({ label, onPress, icon, tone = 'primary', hint, disabled }: Props) {
  const t = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: t.bg, borderColor: t.border ?? t.bg, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={24} color={t.fg} /> : null}
        <AppText bold variant="base" color={t.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
