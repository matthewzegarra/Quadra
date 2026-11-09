import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { setTaps } from '@/components/ClickCounter';
import { CloseButton, Field } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { createReport } from '@/data/repositories/emergency';
import type { EmergencyReport } from '@/data/types';
import { findItem, NEEDS } from '@/features/catalog';
import { currentUserName } from '@/features/session/store';
import type { ParsedPost } from '@/features/voice/parseVoiceOffline';
import { parseVoiceOffline } from '@/features/voice/parseVoiceOffline';
import { useConnectivity } from '@/lib/connectivity';
import { mapsLink, openSms } from '@/lib/contact';
import { useLocationStore } from '@/lib/location';
import { useMesh } from '@/mesh/MeshRouter';
import { colors, elevation, radius, spacing } from '@/theme/tokens';

// SOS en 1 toque + confirmación. Viaja por internet y por la red vecinal (mesh). Plan B: SMS.
export default function SOSScreen() {
  const params = useLocalSearchParams<{ text?: string; parsed?: string }>();
  const initial = (() => {
    try {
      return params.parsed ? (JSON.parse(params.parsed) as ParsedPost) : null;
    } catch {
      return null;
    }
  })();
  const [need, setNeed] = useState<string>(initial?.need ?? 'rescate');
  const [people, setPeople] = useState(1);
  const [description, setDescription] = useState(params.text ?? '');
  const [sent, setSent] = useState<{ report: EmergencyReport; peers: number } | null>(null);
  const isOnline = useConnectivity((s) => s.isOnline);
  const peers = useMesh((s) => s.peers.filter((p) => p.connected).length);
  const coords = useLocationStore((s) => s.coords);

  const smsBody = () =>
    `SOS de ${currentUserName()} (Quadra): necesito ${findItem(NEEDS, need).label.toLowerCase()}. ${description ? description + '. ' : ''}${people} persona(s). Ubicación: ${mapsLink(coords)}`;

  const send = () =>
    Alert.alert('¿Enviar SOS?', 'Tus vecinos cercanos recibirán tu pedido de ayuda con tu ubicación exacta para poder encontrarte.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar SOS',
        style: 'destructive',
        onPress: async () => {
          setTaps(3);
          const res = await createReport({ kind: 'sos', need, description: description || `Necesito ${findItem(NEEDS, need).label.toLowerCase()}`, people_count: people });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSent(res);
          setTimeout(() => setTaps(0), 4000);
        },
      },
    ]);

  if (sent) {
    const reached = sent.peers > 0 || isOnline;
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sentIcon}>
            <Ionicons name={reached ? 'checkmark' : 'time-outline'} size={56} color={colors.white} />
          </View>
          <AppText variant="hero" bold style={{ textAlign: 'center' }}>
            {reached ? 'Tu SOS fue enviado' : 'Tu SOS está guardado'}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {isOnline ? <Row icon="cloud-done-outline" text="Enviado por internet a todo el barrio" /> : <Row icon="cloud-offline-outline" text="Sin internet: se sube apenas haya señal" />}
            {sent.peers > 0 ? (
              <Row icon="bluetooth" text={`Enviado por red vecinal a ${sent.peers} ${sent.peers === 1 ? 'vecino' : 'vecinos'}; ellos lo pasan a otros`} />
            ) : (
              <Row icon="bluetooth" text="Red vecinal: se enviará en cuanto un vecino con Quadra esté cerca" />
            )}
          </View>
          {!reached ? (
            <View style={styles.planB}>
              <AppText bold variant="large">
                Plan B: envíalo por SMS
              </AppText>
              <AppText color={colors.inkSoft}>No hay internet ni vecinos conectados. Los SMS suelen funcionar aunque los datos no.</AppText>
              <BigButton label="Enviar por SMS" icon="mail-outline" tone="danger" onPress={() => openSms(smsBody())} />
            </View>
          ) : (
            <BigButton label="Enviar también por SMS" icon="mail-outline" tone="outline" onPress={() => openSms(smsBody())} />
          )}
          <BigButton label="Ver el Tablero" icon="location-outline" onPress={() => router.replace('/emergencia')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <CloseButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/emergencia'))} />
            <View style={[styles.meshPill, !isOnline && peers === 0 && { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name={peers > 0 ? 'bluetooth' : isOnline ? 'cloud-done-outline' : 'search-outline'} size={18} color={colors.primaryDark} />
              <AppText bold variant="small" color={colors.primaryDark}>
                {peers > 0 ? `Red vecinal · ${peers} conectados` : isOnline ? 'Con internet' : 'Buscando vecinos…'}
              </AppText>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Ionicons name="warning" size={30} color={colors.white} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="hero" bold color={colors.danger} accessibilityRole="header">
                Necesito ayuda
              </AppText>
              <AppText color={colors.inkSoft}>¿Qué necesitas? Toca una opción.</AppText>
            </View>
          </View>
          <View style={styles.grid}>
            {NEEDS.map((n) => {
              const sel = need === n.key;
              return (
                <Pressable
                  key={n.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={n.label}
                  onPress={() => setNeed(n.key)}
                  style={({ pressed }) => [styles.need, sel && styles.needOn, pressed && { transform: [{ scale: 0.97 }] }]}
                >
                  <View style={[styles.needIcon, { backgroundColor: sel ? colors.danger : n.bg }]}>
                    <Ionicons name={n.icon} size={24} color={sel ? colors.white : n.color} />
                  </View>
                  {/* Una sola línea: se achica si no entra ("Medicinas" en pantallas angostas) */}
                  <AppText bold variant="small" color={sel ? colors.danger : colors.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.needLabel}>
                    {n.label}
                  </AppText>
                  {sel ? (
                    <View style={styles.needCheck}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.people}>
            <AppText bold style={{ flex: 1 }}>
              ¿Cuántas personas?
            </AppText>
            <Pressable accessibilityLabel="Menos personas" onPress={() => setPeople(Math.max(1, people - 1))} style={styles.step}>
              <Ionicons name="remove" size={28} color={colors.ink} />
            </Pressable>
            <AppText bold variant="title" style={{ minWidth: 40, textAlign: 'center' }}>
              {people}
            </AppText>
            <Pressable accessibilityLabel="Más personas" onPress={() => setPeople(people + 1)} style={styles.step}>
              <Ionicons name="add" size={28} color={colors.ink} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Mensaje (opcional)" value={description} onChangeText={setDescription} placeholder="Ej. Se inunda mi casa" />
            </View>
            <View style={{ justifyContent: 'flex-end' }}>
              <MicButton
                onText={(t) => {
                  setDescription(t);
                  const p = parseVoiceOffline(t);
                  if (p.need) setNeed(p.need);
                }}
                label="Dictar mensaje"
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.privacy}>
            <Ionicons name="location" size={18} color={colors.danger} />
            <AppText variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
              Tu ubicación exacta va con el SOS para que puedan encontrarte.
            </AppText>
          </View>
          <BigButton label="Enviar SOS" icon="warning" tone="danger" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgEmergency },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meshPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', ...elevation(2) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  need: {
    width: '23%',
    flexGrow: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...elevation(1),
  },
  needOn: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  needIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  needLabel: { textAlign: 'center', alignSelf: 'stretch' },
  needCheck: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  people: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  step: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  sentIcon: { alignSelf: 'center', width: 104, height: 104, borderRadius: 52, backgroundColor: colors.ok, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  planB: { gap: spacing.md, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.danger, borderRadius: radius.lg, padding: spacing.lg },
});
