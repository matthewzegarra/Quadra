import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { useSession } from '@/features/session/store';
import { speak, stopSpeaking } from '@/lib/tts';
import { colors, radius, spacing } from '@/theme/tokens';

// Coach marks: después del tutorial, señalamos los 3 botones reales más importantes.

type Mark = { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; at: (top: number, bottom: number) => ViewStyle; arrow: 'up' | 'down' };

const MARKS: Mark[] = [
  {
    title: 'Publica en 3 toques',
    body: 'Toca el botón naranja "Publicar" para ofrecer, vender o pedir ayuda. También puedes decirlo con tu voz.',
    icon: 'add-circle',
    at: (_t, b) => ({ bottom: b + 110, left: spacing.xl, right: spacing.xl }),
    arrow: 'down',
  },
  {
    title: 'Botón SOS',
    body: 'En una emergencia toca SOS. Tu pedido de ayuda llega a tus vecinos aunque no haya internet.',
    icon: 'warning',
    at: (t) => ({ top: t + 100, left: spacing.xl, right: spacing.xl }),
    arrow: 'up',
  },
  {
    title: 'A pie · 1.5 km',
    body: 'Te mostramos lo que está cerca, a pocos minutos caminando. Tócalo para ver todo el distrito.',
    icon: 'walk',
    at: (t) => ({ top: t + 300, left: spacing.xl, right: spacing.xl }),
    arrow: 'up',
  },
];

export function CoachMarks() {
  const { onboardingDone, coachDone, completeCoach } = useSession();
  const [i, setI] = useState(0);
  const insets = useSafeAreaInsets();
  if (!onboardingDone || coachDone) return null;
  const m = MARKS[i];
  const last = i === MARKS.length - 1;
  const next = () => {
    void stopSpeaking();
    if (last) completeCoach();
    else setI(i + 1);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={completeCoach}>
      <View style={styles.dim}>
        <View style={[styles.bubble, m.at(insets.top, insets.bottom)]} accessibilityViewIsModal>
          {m.arrow === 'up' ? <View style={[styles.arrow, styles.arrowUp, i === 1 && { alignSelf: 'flex-end', marginRight: 40 }]} /> : null}
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Ionicons name={m.icon} size={28} color={i === 1 ? colors.danger : colors.primary} />
              <AppText bold variant="large" style={{ flex: 1 }}>
                {m.title}
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Escuchar" onPress={() => speak(`${m.title}. ${m.body}`, 'coach')}>
                <Ionicons name="volume-medium-outline" size={28} color={colors.primary} />
              </Pressable>
            </View>
            <AppText color={colors.inkSoft}>{m.body}</AppText>
            <BigButton label={last ? 'Entendido' : `Siguiente (${i + 1}/${MARKS.length})`} onPress={next} />
            <Pressable accessibilityRole="button" onPress={completeCoach} style={{ alignSelf: 'center', padding: spacing.sm }}>
              <AppText bold color={colors.textSecondary}>
                Saltar
              </AppText>
            </Pressable>
          </View>
          {m.arrow === 'down' ? <View style={[styles.arrow, styles.arrowDown]} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(28,27,25,0.55)' },
  bubble: { position: 'absolute' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arrow: { width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center' },
  arrowUp: { borderBottomWidth: 16, borderBottomColor: colors.surface },
  arrowDown: { borderTopWidth: 16, borderTopColor: colors.surface },
});
