import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { useSession } from '@/features/session/store';
import { speak, stopSpeaking, useTts } from '@/lib/tts';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

// Tutorial obligatorio (prompt.md §6.1). Diseño: design/pantallas/Tutorial.dc.html

const QUADRI = require('../../../assets/brand/quadri.png');

type Step = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
};

const STEPS: Step[] = [
  {
    title: 'Encuentra lo que necesitas cerca de casa',
    body: 'Gasfiteros, clases, comida casera y más, recomendados por tus propios vecinos. Sin salir lejos del barrio.',
    icon: 'location',
    tint: colors.primary,
    bg: colors.primarySoft,
  },
  {
    title: 'Ayuda y pide ayuda sin dinero',
    body: 'Presta herramientas, dona lo que no usas o pide una mano. Hoy te ayudo, mañana me ayudas.',
    icon: 'heart',
    tint: colors.accentInk,
    bg: colors.accentSoft,
  },
  {
    title: 'En una emergencia, tu barrio sigue conectado aunque no haya internet',
    body: 'Tu celular pasa los mensajes de auxilio de vecino en vecino por Bluetooth. Nadie se queda solo.',
    icon: 'warning',
    tint: colors.danger,
    bg: colors.dangerSoft,
  },
];

export default function TutorialScreen() {
  const [index, setIndex] = useState(0);
  const completeOnboarding = useSession((s) => s.completeOnboarding);
  const hasName = useSession((s) => Boolean(s.displayName));
  const speaking = useTts((s) => s.speakingId === `tutorial-${index}`);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => () => void stopSpeaking(), []);

  const finish = () => {
    void stopSpeaking();
    completeOnboarding();
    router.replace(hasName ? '/' : '/bienvenida');
  };

  const next = () => {
    void stopSpeaking();
    if (isLast) finish();
    else setIndex(index + 1);
  };

  const listen = () => {
    if (speaking) void stopSpeaking();
    else void speak(`${step.title}. ${step.body}`, `tutorial-${index}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../../assets/brand/logo-tile.png')} style={styles.logo} accessibilityIgnoresInvertColors />
          <AppText variant="large" bold>
            Quadra
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saltar tutorial"
          onPress={finish}
          style={styles.skip}
        >
          <AppText bold color={colors.primary} style={styles.underline}>
            Saltar
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quadri, la mascota: protagonista en el paso 1 y acompaña en los demás */}
        <View style={[styles.illustration, { backgroundColor: step.bg }]} accessible={false}>
          {index === 0 ? (
            <Image source={QUADRI} style={styles.quadriBig} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <>
              <Ionicons name={step.icon} size={120} color={step.tint} />
              <Image source={QUADRI} style={styles.quadriSmall} resizeMode="contain" accessibilityIgnoresInvertColors />
            </>
          )}
        </View>

        <AppText bold color={colors.primary}>
          Paso {index + 1} de {STEPS.length}
        </AppText>
        <AppText variant="hero" bold accessibilityRole="header">
          {step.title}
        </AppText>
        <AppText color={colors.inkSoft}>{step.body}</AppText>

        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={speaking ? 'Detener lectura' : 'Escuchar'}
            accessibilityHint="Lee este paso en voz alta"
            onPress={listen}
            style={[styles.listen, speaking && { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-medium-outline'} size={22} color={colors.primary} />
            <AppText bold color={colors.primary}>
              {speaking ? 'Leyendo…' : 'Escuchar'}
            </AppText>
          </Pressable>
          <View style={styles.dots} accessibilityLabel={`Paso ${index + 1} de ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BigButton
          label={isLast ? 'Empezar' : 'Siguiente'}
          icon={isLast ? 'checkmark' : 'chevron-forward'}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 40, height: 40, borderRadius: 11 },
  skip: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignItems: 'flex-end' },
  underline: { textDecorationLine: 'underline' },
  content: { padding: spacing.xl, gap: spacing.md },
  illustration: {
    height: 280,
    borderRadius: radius.lg + 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  quadriBig: { height: 240, width: 200 },
  quadriSmall: { position: 'absolute', right: 16, bottom: 12, height: 110, width: 90 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH - 8,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  dots: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderStrong },
  dotActive: { width: 36, backgroundColor: colors.primary },
  footer: { padding: spacing.xl, paddingTop: spacing.sm },
});
