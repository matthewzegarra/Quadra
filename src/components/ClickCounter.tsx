import { StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { AppText } from '@/components/AppText';
import { useSession } from '@/features/session/store';
import { colors, radius, spacing } from '@/theme/tokens';

// Contador "máximo 3 toques para publicar" (modo demo). Requisito del jurado.

type ClickState = { taps: number; set: (n: number) => void };
export const useClicks = create<ClickState>((set) => ({ taps: 0, set: (taps) => set({ taps }) }));
export const setTaps = (n: number) => useClicks.getState().set(n);

/** Pastilla "Toque 2 de 3" del diseño. Visible siempre en el flujo de publicar. */
export function TapPill({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.pill} accessibilityLabel={`Toque ${step} de 3`}>
      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.accent : colors.borderStrong }]} />
        ))}
      </View>
      <AppText bold color={colors.accentInk}>
        Toque {step} de 3
      </AppText>
    </View>
  );
}

/** Contador flotante del modo demo: "Toques: 2/3" → "3/3 ✓". */
export function ClickCounter() {
  const demo = useSession((s) => s.demoMode);
  const taps = useClicks((s) => s.taps);
  if (!demo || taps === 0) return null;
  const done = taps >= 3;
  return (
    <View pointerEvents="none" style={[styles.floating, done && { backgroundColor: colors.ok }]}>
      <AppText bold color={colors.white}>
        Toques: {Math.min(taps, 3)}/3 {done ? '✓' : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  floating: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    zIndex: 100,
    elevation: 10,
  },
});
