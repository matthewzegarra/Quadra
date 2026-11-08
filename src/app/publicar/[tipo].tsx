import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { setTaps, TapPill } from '@/components/ClickCounter';
import { BackHeader, Badge, Chip, Field } from '@/components/ui';
import { VoiceCard } from '@/components/VoiceButton';
import { createFavor } from '@/data/repositories/favors';
import { createListing } from '@/data/repositories/listings';
import type { FavorType, MobilityRole } from '@/data/types';
import { FAVOR_CATEGORIES, findItem, firstName, LISTING_CATEGORIES } from '@/features/catalog';
import type { PublishTipo } from '@/features/publish/publishTypes';
import { useSession } from '@/features/session/store';
import { parseVoice } from '@/features/voice/parseVoice';
import type { ParsedPost } from '@/features/voice/parseVoiceOffline';
import { useConnectivity } from '@/lib/connectivity';
import { refreshLocation, useLocationStore } from '@/lib/location';
import { colors, radius, spacing } from '@/theme/tokens';

// Publicar · toque 3 de 3: todo prellenado, campos opcionales. Diseño: design/pantallas/Confirmar.dc.html

const TIPO_LABEL: Record<Exclude<PublishTipo, 'emergencia'>, string> = {
  servicio: 'Ofrezco un servicio',
  producto: 'Vendo un producto',
  pido: 'Pido una mano',
  presto: 'Presto o dono',
  movilidad: 'Movilidad solidaria',
};
const DAYS = [
  ['lun', 'Lun'],
  ['mar', 'Mar'],
  ['mie', 'Mié'],
  ['jue', 'Jue'],
  ['vie', 'Vie'],
  ['sab', 'Sáb'],
  ['dom', 'Dom'],
] as const;
const ROLES: { key: MobilityRole; label: string }[] = [
  { key: 'llevo', label: 'Llevo' },
  { key: 'recojo', label: 'Recojo' },
  { key: 'busco', label: 'Busco quién lleve' },
];
const SHARE_TYPES: { key: FavorType; label: string }[] = [
  { key: 'presto', label: 'Presto' },
  { key: 'dono', label: 'Dono' },
  { key: 'intercambio', label: 'Intercambio' },
  { key: 'ofrezco', label: 'Ofrezco ayuda' },
];

export default function ConfirmarScreen() {
  const params = useLocalSearchParams<{ tipo: Exclude<PublishTipo, 'emergencia'>; text?: string; parsed?: string }>();
  const tipo = params.tipo ?? 'servicio';
  const isListing = tipo === 'servicio' || tipo === 'producto';
  const name = firstName(useSession((s) => s.displayName));
  const loc = useLocationStore();
  const isOnline = useConnectivity((s) => s.isOnline);

  const [heard, setHeard] = useState<string | null>(params.text ?? null);
  const [parsing, setParsing] = useState(false);
  const [category, setCategory] = useState(isListing ? (tipo === 'producto' ? 'comida' : 'otros') : tipo === 'movilidad' ? 'movilidad' : 'otros');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [schedule, setSchedule] = useState('');
  const [favorType, setFavorType] = useState<FavorType>(tipo === 'pido' ? 'pido' : tipo === 'movilidad' ? 'movilidad' : 'presto');
  const [destination, setDestination] = useState('');
  const [time, setTime] = useState('07:15');
  const [days, setDays] = useState<string[]>(['lun', 'mar', 'mie', 'jue', 'vie']);
  const [role, setRole] = useState<MobilityRole>('llevo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshLocation();
  }, []);

  const applyParsed = (p: ParsedPost) => {
    if (p.category) setCategory(p.category);
    if (p.title) {
      setTitle(p.title);
      setTitleTouched(true);
    }
    if (p.description) setDescription(p.description);
    if (p.price_hint) setPrice(p.price_hint);
    if (p.schedule) setSchedule(p.schedule);
    if (p.type && tipo === 'presto' && SHARE_TYPES.some((s) => s.key === p.type)) setFavorType(p.type);
  };

  // Venimos de la pantalla anterior con lo dictado
  useEffect(() => {
    if (params.parsed) {
      try {
        applyParsed(JSON.parse(params.parsed) as ParsedPost);
      } catch {
        // ignorar
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVoice = async (text: string) => {
    setHeard(text);
    setParsing(true);
    try {
      applyParsed(await parseVoice(text));
    } finally {
      setParsing(false);
    }
  };

  const categories = isListing ? LISTING_CATEGORIES : FAVOR_CATEGORIES.filter((c) => c.key !== 'movilidad');
  const cat = findItem(isListing ? LISTING_CATEGORIES : FAVOR_CATEGORIES, category);

  // Título sugerido (mientras el vecino no lo escriba)
  const suggested = useMemo(() => {
    switch (tipo) {
      case 'servicio':
        return category === 'otros' ? `Servicio de ${name}` : `${name} · ${cat.label}`;
      case 'producto':
        return category === 'otros' ? `Productos de ${name}` : `${cat.label} de ${name}`;
      case 'pido':
        return category === 'otros' ? 'Necesito una mano' : `Necesito ayuda con ${cat.label.toLowerCase()}`;
      case 'presto':
        return `${SHARE_TYPES.find((s) => s.key === favorType)?.label ?? 'Presto'} ${category === 'otros' ? 'algo útil' : cat.label.toLowerCase()}`;
      case 'movilidad': {
        const dest = destination.trim() || 'el colegio';
        if (role === 'busco') return `Busco quién lleve a mi hijo a ${dest}`;
        return `${role === 'llevo' ? 'Llevo' : 'Recojo'} a ${dest} a las ${time}`;
      }
    }
  }, [tipo, category, cat.label, name, favorType, destination, role, time]);
  const finalTitle = titleTouched && title.trim() ? title : suggested;

  const publish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setTaps(3); // toque 3 de 3
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const location = useLocationStore.getState().coords;
      if (isListing) {
        const id = await createListing({
          kind: tipo === 'producto' ? 'producto' : 'servicio',
          category,
          title: finalTitle,
          description: description || null,
          price_hint: price || null,
          schedule: schedule || null,
          location,
          whatsapp: useSession.getState().whatsapp,
        });
        router.replace(`/listing/${id}`);
      } else {
        const id = await createFavor({
          type: tipo === 'movilidad' ? 'movilidad' : tipo === 'pido' ? 'pido' : favorType,
          category: tipo === 'movilidad' ? 'movilidad' : category,
          title: finalTitle,
          description: description || null,
          location,
          mobility: tipo === 'movilidad' ? { destination: destination.trim() || 'Colegio', days, time, role } : undefined,
        });
        router.replace(`/favor/${id}`);
      }
      setTimeout(() => setTaps(0), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackHeader right={<TapPill step={3} />} />
          <AppText variant="hero" bold accessibilityRole="header">
            Revisa y publica
          </AppText>

          {heard ? (
            <View style={styles.heard}>
              <View style={styles.heardRow}>
                <View style={styles.micCircle}>
                  <Ionicons name="mic-outline" size={24} color={colors.primary} />
                </View>
                <AppText color="#D7EBE4" style={{ flex: 1 }}>
                  Te escuchamos decir:
                </AppText>
                {parsing ? <ActivityIndicator color={colors.accent} /> : null}
              </View>
              <AppText bold variant="large" color={colors.white}>
                “{heard}”
              </AppText>
            </View>
          ) : (
            <VoiceCard onText={onVoice} title="Dilo con tu voz" hint="Y llenamos todo por ti" />
          )}

          <View style={styles.badges}>
            <Badge label={TIPO_LABEL[tipo]} color={colors.accentInk} bg={colors.accentSoft} />
            {tipo !== 'movilidad' ? <Badge label={cat.label} color={colors.ink} bg={colors.surfaceMuted} icon={cat.icon} /> : null}
          </View>

          {tipo === 'presto' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {SHARE_TYPES.map((s) => (
                <Chip key={s.key} label={s.label} selected={favorType === s.key} onPress={() => setFavorType(s.key)} />
              ))}
            </ScrollView>
          ) : null}

          {tipo !== 'movilidad' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((c) => (
                <Chip key={c.key} label={c.label} icon={c.icon} selected={category === c.key} onPress={() => setCategory(c.key)} />
              ))}
            </ScrollView>
          ) : (
            <>
              <Field label="¿A dónde?" value={destination} onChangeText={setDestination} placeholder="Ej. Colegio San Antonio" />
              <View style={styles.row2}>
                <Field label="Hora" value={time} onChangeText={setTime} placeholder="07:15" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
              </View>
              <AppText bold variant="small" color={colors.inkSoft}>
                Días
              </AppText>
              <View style={styles.wrap}>
                {DAYS.map(([k, l]) => (
                  <Chip key={k} label={l} selected={days.includes(k)} onPress={() => setDays(days.includes(k) ? days.filter((d) => d !== k) : [...days, k])} />
                ))}
              </View>
              <View style={styles.wrap}>
                {ROLES.map((r) => (
                  <Chip key={r.key} label={r.label} selected={role === r.key} onPress={() => setRole(r.key)} />
                ))}
              </View>
            </>
          )}

          <Field
            label="Título"
            value={finalTitle}
            onChangeText={(t) => {
              setTitle(t);
              setTitleTouched(true);
            }}
          />

          {isListing ? (
            <View style={styles.row2}>
              <Field label="Precio" value={price} onChangeText={setPrice} placeholder="S/ 15 · a convenir" style={{ flex: 1 }} />
              <Field label="Horario" value={schedule} onChangeText={setSchedule} placeholder="Sábados, mañana" style={{ flex: 1 }} />
            </View>
          ) : null}

          <Field label="Detalle (opcional)" value={description} onChangeText={setDescription} placeholder="Cuéntales un poco más" multiline />

          <View style={styles.location}>
            <Ionicons name="location-outline" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText bold>Tu casa · {loc.label ?? 'Lince'}</AppText>
              <AppText variant="small" color={colors.textSecondary}>
                {loc.source === 'gps' ? `Ubicación detectada automáticamente${loc.accuracy ? ` · precisión ${loc.accuracy} m` : ''}` : 'Ubicación del barrio demo (Lince)'}
              </AppText>
            </View>
          </View>

          {!isOnline ? (
            <View style={styles.offline}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.inkSoft} />
              <AppText variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
                Sin internet: se guarda y se envía sola cuando vuelva la señal.
              </AppText>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <BigButton label="Publicar" icon="checkmark" tone="accent" onPress={publish} disabled={saving || !finalTitle.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  heard: { backgroundColor: colors.primary, borderRadius: radius.lg + 4, padding: spacing.xl, gap: spacing.md },
  heardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  micCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.md },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  offline: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  footer: { padding: spacing.xl, paddingTop: spacing.sm },
});
