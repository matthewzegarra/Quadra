import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { setTaps, TapPill } from '@/components/ClickCounter';
import { CloseButton } from '@/components/ui';
import { VoiceCard } from '@/components/VoiceButton';
import { openLocalEmergency } from '@/data/repositories/emergency';
import { PUBLISH_TILES, tipoFromParsed, type PublishTipo } from '@/features/publish/publishTypes';
import { parseVoice } from '@/features/voice/parseVoice';
import { colors, radius, spacing } from '@/theme/tokens';

// Publicar · toque 2 de 3. Diseño: design/pantallas/Publicar.dc.html
export default function PublicarScreen() {
  const [parsing, setParsing] = useState(false);

  const go = (tipo: PublishTipo, params: Record<string, string> = {}) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTaps(2);
    if (tipo === 'emergencia') {
      router.push({ pathname: '/emergencia/sos', params });
      void openLocalEmergency();
      return;
    }
    router.push({ pathname: '/publicar/[tipo]', params: { tipo, ...params } });
  };

  const onVoice = async (text: string) => {
    setParsing(true);
    try {
      const parsed = await parseVoice(text);
      go(tipoFromParsed(parsed), { text, parsed: JSON.stringify(parsed) });
    } finally {
      setParsing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <CloseButton
            onPress={() => {
              setTaps(0);
              if (router.canGoBack()) router.back();
              else router.navigate('/');
            }}
          />
          <TapPill step={2} />
        </View>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="hero" bold accessibilityRole="header">
            ¿Qué quieres publicar?
          </AppText>
          <AppText color={colors.textSecondary}>Elige una opción. Tu ubicación ya está lista.</AppText>
        </View>

        <View style={styles.grid}>
          {PUBLISH_TILES.map((t) => {
            const danger = t.tipo === 'emergencia';
            return (
              <Pressable
                key={t.tipo}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                onPress={() => go(t.tipo)}
                style={({ pressed }) => [styles.tile, danger && styles.tileDanger, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
                  <Ionicons name={t.icon} size={34} color={t.color} />
                </View>
                <AppText bold variant="large" color={danger ? colors.white : colors.ink}>
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {parsing ? (
          <View style={styles.parsing}>
            <ActivityIndicator color={colors.white} />
            <AppText bold color={colors.white}>
              Armando tu publicación…
            </AppText>
          </View>
        ) : (
          <VoiceCard
            onText={(t) => {
              setTaps(2);
              void onVoice(t);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 150,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tileDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  tileIcon: { width: 60, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: spacing.xl, paddingTop: 0 },
  parsing: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg + 4,
    minHeight: 104,
  },
});
