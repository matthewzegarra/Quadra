import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useVoiceInput } from '@/features/voice/useVoiceInput';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

/** Botón cuadrado de micrófono (junto a un campo de texto). */
export function MicButton({ onText, label = 'Dictar con tu voz' }: { onText: (t: string) => void; label?: string }) {
  const { listening, start, stop } = useVoiceInput(onText);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Detener micrófono' : label}
      onPress={listening ? stop : start}
      style={[styles.mic, listening && { backgroundColor: colors.danger }]}
    >
      <Ionicons name={listening ? 'stop' : 'mic-outline'} size={28} color={colors.white} />
    </Pressable>
  );
}

/** Tarjeta verde grande "O dilo con tu voz" del diseño (Publicar). */
export function VoiceCard({
  onText,
  title = 'O dilo con tu voz',
  hint = '“Vendo lasañas a 15 soles los sábados”',
}: {
  onText: (t: string) => void;
  title?: string;
  hint?: string;
}) {
  const { listening, partial, start, stop } = useVoiceInput(onText);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Te estamos escuchando. Toca para terminar' : 'Dilo con tu voz'}
      accessibilityHint="Dicta lo que quieres publicar y armamos la publicación"
      onPress={listening ? stop : start}
      style={styles.card}
    >
      <View style={[styles.circle, listening && { backgroundColor: colors.accent }]}>
        <Ionicons name={listening ? 'stop' : 'mic-outline'} size={36} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText bold variant="large" color={colors.white}>
          {listening ? 'Te escucho…' : title}
        </AppText>
        <AppText variant="small" color="#D7EBE4" numberOfLines={3}>
          {listening ? partial || 'Habla ahora. Toca para terminar.' : hint}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mic: {
    width: MIN_TOUCH + 8,
    height: MIN_TOUCH + 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
