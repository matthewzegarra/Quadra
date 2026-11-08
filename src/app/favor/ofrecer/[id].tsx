import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { QuadraMap } from '@/components/QuadraMap';
import { BigButton } from '@/components/BigButton';
import { Avatar, BackHeader, Field } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { offerHelp, useFavor } from '@/data/repositories/favors';
import { firstName, initials } from '@/features/catalog';
import { distanceMeters, formatDistance, type LatLng } from '@/lib/geo';
import { refreshLocation, reverseLabel, useLocationStore } from '@/lib/location';
import { colors, radius, spacing } from '@/theme/tokens';

// "Yo te ayudo" en 2 toques. Diseño: design/pantallas/OfrecerAyuda.dc.html
export default function OfrecerAyudaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFavor(id);
  const loc = useLocationStore();
  const [source, setSource] = useState<'gps' | 'mapa'>('gps');
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [message, setMessage] = useState('Lo tengo, pasa cuando quieras');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void refreshLocation();
  }, []);

  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => reverseLabel(picked).then(setPickedLabel), 600);
    return () => clearTimeout(t);
  }, [picked]);

  if (!data) return <SafeAreaView style={styles.safe} />;
  const { favor, author } = data;
  const name = firstName(author?.display_name);
  const point = source === 'mapa' && picked ? picked : loc.coords;
  const d = distanceMeters(point, favor);

  const send = async () => {
    setSending(true);
    try {
      await offerHelp(favor, {
        location: point,
        source,
        label: source === 'mapa' ? pickedLabel : loc.label,
        message,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(`/favor/${favor.id}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader title="Yo te ayudo" />
          <View style={styles.favor}>
            <Avatar name={author?.display_name} size={56} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText bold variant="large">
                {favor.title}
              </AppText>
              {favor.description ? (
                <AppText variant="small" color={colors.textSecondary} numberOfLines={2}>
                  {favor.description}
                </AppText>
              ) : null}
            </View>
          </View>

          <AppText bold variant="large" accessibilityRole="header">
            ¿Desde dónde ayudas?
          </AppText>
          <Option
            selected={source === 'gps'}
            title="Mi ubicación actual"
            subtitle={`${loc.label ?? 'Lince'}${loc.accuracy ? ` · precisión ${loc.accuracy} m` : loc.source === 'demo' ? ' · ubicación demo' : ''}`}
            onPress={() => setSource('gps')}
          />
          <Option
            selected={source === 'mapa'}
            title="Elegir en el mapa"
            subtitle={source === 'mapa' && pickedLabel ? pickedLabel : 'Si lo que prestas está en otro lugar'}
            onPress={() => {
              setSource('mapa');
              if (!picked) setPicked(loc.coords);
            }}
          />

          <View>
            <QuadraMap
              center={source === 'mapa' ? picked ?? loc.coords : loc.coords}
              user={source === 'gps' ? loc.coords : null}
              pins={[{ id: 'favor', lat: favor.lat, lng: favor.lng, color: colors.accent, text: initials(author?.display_name), label: name }]}
              pickMode={source === 'mapa'}
              onCenterChange={setPicked}
              zoom={15.5}
            />
            {source === 'mapa' ? (
              <View style={styles.mapHint} pointerEvents="none">
                <AppText bold variant="small">
                  Mueve el mapa para ajustar el punto
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.distance} accessibilityLiveRegion="polite">
            <Ionicons name="walk" size={24} color={colors.accentInk} />
            <AppText bold color={colors.accentInk} style={{ flex: 1 }}>
              Estarás a {formatDistance(d).replace(' · ', ` de ${name} · `)}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Tu mensaje" value={message} onChangeText={setMessage} />
            </View>
            <View style={{ justifyContent: 'flex-end' }}>
              <MicButton onText={setMessage} label="Dictar mensaje" />
            </View>
          </View>

          <AppText variant="small" color={colors.textSecondary}>
            {name} verá tu ubicación aproximada. Tu dirección exacta y tu WhatsApp se comparten solo si te elige.
          </AppText>
        </ScrollView>
        <View style={styles.footer}>
          <BigButton label="Enviar oferta" icon="heart-outline" onPress={send} disabled={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Option({ selected, title, subtitle, onPress }: { selected: boolean; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={[styles.option, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
    >
      <View style={[styles.radio, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {selected ? <Ionicons name="checkmark" size={20} color={colors.white} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText bold variant="large">
          {title}
        </AppText>
        <AppText variant="small" color={colors.textSecondary}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  favor: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 72, borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface },
  radio: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
  mapHint: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  distance: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.lg },
  footer: { padding: spacing.xl, paddingTop: spacing.sm },
});
