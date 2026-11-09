import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Avatar, Card, Chip, Field, Section } from '@/components/ui';
import { activateZoneEmergency, claimZoneAdmin } from '@/data/repositories/emergency';
import { useMyFavors } from '@/data/repositories/favors';
import { useMyListings } from '@/data/repositories/listings';
import { setDemoZone, updateMyProfile } from '@/data/repositories/profiles';
import { useSyncState } from '@/data/store';
import { syncNow } from '@/data/sync/SyncEngine';
import type { Profile } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { EMERGENCY_TYPES, FAVOR_TYPES } from '@/features/catalog';
import { useCurrentUserId, useSession } from '@/features/session/store';
import { useConnectivity } from '@/lib/connectivity';
import { locationText, refreshLocation, useLocationStore } from '@/lib/location';
import {
  notify,
  openNotificationSettings,
  refreshNotificationPermission,
  requestNotificationPermission,
  useNotifications,
} from '@/lib/notify';
import { isSupabaseConfigured, signOutAccount } from '@/lib/supabase';
import { useMesh } from '@/mesh/MeshRouter';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

export default function PerfilScreen() {
  const s = useSession();
  const me = useCurrentUserId();
  const { data: profile } = useLocalQuery<Profile | null>(['profiles'], (db) => db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE id = ?', [me]), [me]);
  const { data: listings = [] } = useMyListings();
  const { data: favors = [] } = useMyFavors();
  const isOnline = useConnectivity((x) => x.isOnline);
  const sync = useSyncState();
  const mesh = useMesh();
  const loc = useLocationStore();
  const [pin, setPin] = useState('');
  const [etype, setEtype] = useState('sismo');
  const isAdmin = profile?.is_zone_admin === 1;

  const activate = () =>
    Alert.alert('¿Activar Modo Emergencia?', `Toda la zona de tu junta vecinal pasará a Modo Emergencia (${EMERGENCY_TYPES.find((t) => t.key === etype)?.label}). Llega por internet y por la red vecinal.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Activar',
        style: 'destructive',
        onPress: async () => {
          await activateZoneEmergency(etype);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Avatar name={s.displayName} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="title" bold accessibilityRole="header">
              {s.displayName ?? 'Vecino'}
            </AppText>
            <AppText color={colors.textSecondary}>
              {locationText(loc)}{isAdmin ? ' · Junta vecinal' : ''}
              {s.dniLast4 ? ` · DNI ****${s.dniLast4}` : ''}
            </AppText>
          </View>
          <View style={styles.aynis}>
            <AppText bold variant="title" color={colors.accentInk}>
              {profile?.aynis ?? 0}
            </AppText>
            <AppText bold variant="small" color={colors.accentInk}>
              Quadri Points
            </AppText>
          </View>
        </View>
        <AppText variant="small" color={colors.textSecondary}>
          Los Quadri Points reconocen tu ayuda: ayudar suma y pedir nunca resta. Hoy te ayudo, mañana me ayudas.
        </AppText>
        <BigButton label="Novedades" icon="paw-outline" tone="outline" onPress={() => router.push('/novedades')} />
        <BigButton label="Editar mi nombre y WhatsApp" icon="create-outline" tone="outline" onPress={() => router.push({ pathname: '/bienvenida', params: { editar: '1' } })} />

        <OfflineBanner />

        <Section title="Mis publicaciones">
          {listings.length + favors.length === 0 ? <AppText color={colors.textSecondary}>Aún no publicas nada. Toca “Publicar”.</AppText> : null}
          {listings.map((l) => (
            <Row key={l.id} icon="storefront-outline" title={l.title} subtitle={`Visto Bueno · ${l.visto_bueno_count}`} onPress={() => router.push(`/listing/${l.id}`)} />
          ))}
          {favors.map((f) => (
            <Row key={f.id} icon={FAVOR_TYPES[f.type].icon} title={f.title} subtitle={`${FAVOR_TYPES[f.type].label} · ${f.status.replace('_', ' ')}`} onPress={() => router.push(`/favor/${f.id}`)} />
          ))}
        </Section>

        <Section title="Preferencias">
          <Toggle label="Modo fácil (letra extra grande)" value={s.easyMode} onChange={(v) => { s.setEasyMode(v); void updateMyProfile({ easy_mode: v ? 1 : 0 }); }} />
          <Toggle
            label="Soy persona vulnerable"
            hint="Adulto mayor o con discapacidad. En una emergencia, tus vecinos cercanos sabrán que deben ir a verte."
            value={profile?.is_vulnerable === 1}
            onChange={(v) => void updateMyProfile({ is_vulnerable: v ? 1 : 0 })}
          />
          <NotificationsSetting />
          <Toggle label="Red vecinal (Bluetooth)" hint="Se activa sola en emergencia o sin internet." value={s.meshEnabled} onChange={s.setMeshEnabled} />
          <Toggle
            label="Ver el barrio demo (Lince)"
            hint="Para ensayar con los datos de prueba. Apagado, Quadra usa tu ubicación real."
            value={loc.simulateDemo}
            onChange={(v) => void setDemoZone(v)}
          />
          <Toggle
            label="Modo demo"
            hint="Publica sin esperar a la junta. Sirve para ensayar. Apagado, todo pasa por revisión."
            value={s.demoMode}
            onChange={(v) => {
              s.setDemoMode(v);
              void updateMyProfile({ demo_mode: v ? 1 : 0 });
            }}
          />
          <BigButton label="Ver tutorial" icon="school-outline" tone="outline" onPress={() => { s.resetOnboarding(); router.replace('/tutorial'); }} />
          <BigButton
            label="Cerrar sesión"
            icon="log-out-outline"
            tone="outline"
            onPress={() => {
              Alert.alert('¿Cerrar sesión?', 'Tus publicaciones siguen en este celular.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar sesión',
                  style: 'destructive',
                  onPress: async () => {
                    await signOutAccount();
                    s.clearAuth();
                    router.replace('/bienvenida');
                  },
                },
              ]);
            }}
          />
        </Section>

        <Section title="Junta vecinal">
          {isAdmin ? (
            <Card borderColor={colors.danger}>
              <AppText bold>Activar Modo Emergencia para toda la zona</AppText>
              <View style={styles.wrap}>
                {EMERGENCY_TYPES.map((t) => (
                  <Chip key={t.key} label={t.label} tone="danger" selected={etype === t.key} onPress={() => setEtype(t.key)} />
                ))}
              </View>
              <BigButton label="Activar Modo Emergencia" icon="warning" tone="danger" onPress={activate} />
              <BigButton label="Revisar publicaciones y avisos" icon="shield-checkmark-outline" tone="outline" onPress={() => router.push('/moderar')} />
            </Card>
          ) : (
            <Card>
              <AppText color={colors.inkSoft}>¿Eres de la junta vecinal o moderador? Ingresa el código de tu zona para activar el Modo Emergencia y revisar publicaciones.</AppText>
              <Field label="Código de la junta" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry placeholder="••••" />
              <BigButton
                label="Soy de la junta vecinal"
                icon="shield-outline"
                tone="outline"
                disabled={pin.length < 4}
                onPress={async () => {
                  const ok = await claimZoneAdmin(pin);
                  setPin('');
                  Alert.alert(ok ? 'Listo' : 'Código incorrecto', ok ? 'Ahora puedes activar el Modo Emergencia.' : 'Pide el código a tu junta vecinal.');
                }}
              />
            </Card>
          )}
        </Section>

        {s.demoMode ? (
          <Section title="Diagnóstico (demo)">
            <Card>
              <Diag label="Conexión" value={isOnline ? 'en línea' : 'sin conexión'} />
              <Diag label="Supabase" value={isSupabaseConfigured ? (s.authUserId ? (s.email ? 'cuenta con correo' : 'sesión activa') : 'sin cuenta') : 'no configurado'} />
              <Diag label="Por enviar" value={`${sync.pending}`} />
              <Diag label="Última sincronización" value={sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleTimeString() : '—'} />
              {sync.lastError ? <Diag label="Último error" value={sync.lastError} /> : null}
              <Diag label="Ubicación" value={`${loc.source === 'gps' ? 'GPS' : loc.source === 'last' ? 'última conocida' : 'barrio demo'} · ${loc.coords.lat.toFixed(4)}, ${loc.coords.lng.toFixed(4)}`} />
              <Diag label="Red vecinal" value={`${mesh.running ? 'activa' : 'apagada'} · ${mesh.peers.filter((p) => p.connected).length} conectados`} />
              <View style={styles.wrap}>
                <Chip label="Sincronizar ahora" icon="sync-outline" onPress={() => void syncNow()} />
                <Chip label="Actualizar ubicación" icon="locate-outline" onPress={() => void refreshLocation()} />
                <Chip label="Red vecinal" icon="bluetooth" onPress={() => router.push('/red-vecinal')} />
              </View>
            </Card>
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Notificaciones: permiso del sistema + preferencia en la app + prueba. */
function NotificationsSetting() {
  const { permission, enabled, setEnabled } = useNotifications();
  const on = enabled && permission === 'granted';

  // Al volver de Ajustes de Android, revisar si el vecino concedió el permiso
  useEffect(() => {
    refreshNotificationPermission();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refreshNotificationPermission();
    });
    return () => sub.remove();
  }, []);

  const onChange = async (v: boolean) => {
    if (!v) return setEnabled(false);
    if (permission === 'granted') return setEnabled(true);
    const granted = await requestNotificationPermission();
    if (!granted)
      Alert.alert(
        'Notificaciones desactivadas',
        'Android tiene bloqueadas las notificaciones de Quadra. Abre Ajustes → Notificaciones y actívalas.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: openNotificationSettings },
        ],
      );
  };

  const hint =
    permission === 'denied'
      ? 'Bloqueadas en Android. Toca el interruptor para ir a Ajustes.'
      : 'Te avisamos cuando un vecino te ofrece ayuda, si te eligen y si hay un SOS o emergencia cerca.';

  return (
    <>
      <Toggle label="Notificaciones" hint={hint} value={on} onChange={(v) => void onChange(v)} />
      {on ? (
        <Chip
          label="Probar notificación"
          icon="notifications-outline"
          onPress={() => void notify('Quadra · prueba', 'Así te avisaremos de ofertas de ayuda y emergencias del barrio.', { channel: 'favores' })}
        />
      ) : null}
    </>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <AppText bold>{label}</AppText>
        {hint ? (
          <AppText variant="small" color={colors.textSecondary}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function Row({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={26} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText bold numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="small" color={colors.textSecondary}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

function Diag({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <AppText variant="small" bold color={colors.inkSoft}>
        {label}:
      </AppText>
      <AppText variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 140 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  // Tarjeta de puntos: como máximo ~35 % del ancho para no aplastar el título/nombre
  aynis: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', maxWidth: '36%', flexShrink: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toggle: { minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  row: { minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg },
});
