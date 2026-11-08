import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { Linking, Platform } from 'react-native';
import { create } from 'zustand';

// Notificaciones locales (sin servidor de push): ofertas de ayuda, oferta elegida, SOS del barrio,
// Modo Emergencia activado por la junta. Se generan en el celular cuando llega el dato (sync o mesh).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PREF_KEY = 'ayni.notificationsEnabled';
const SENT_PREFIX = 'ayni.notified.';

type PermissionState = 'granted' | 'denied' | 'undetermined';

type NotifyState = {
  /** Permiso del sistema operativo. */
  permission: PermissionState;
  /** Preferencia del vecino dentro de la app (Perfil → Notificaciones). */
  enabled: boolean;
  setEnabled: (v: boolean) => void;
};

export const useNotifications = create<NotifyState>((set) => ({
  permission: 'undetermined',
  enabled: Storage.getItemSync(PREF_KEY) !== '0',
  setEnabled: (enabled) => {
    Storage.setItemSync(PREF_KEY, enabled ? '1' : '0');
    set({ enabled });
  },
}));

let ready = false;

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('emergencia', {
    name: 'Emergencias',
    description: 'SOS de vecinos y Modo Emergencia del barrio',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
  await Notifications.setNotificationChannelAsync('favores', {
    name: 'Cadena de Favores',
    description: 'Ofertas de ayuda y favores aceptados',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function readPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  const state: PermissionState = p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  useNotifications.setState({ permission: state });
  return state;
}

/** Canales + listener de toques. No pide permiso (eso se hace al terminar el registro o desde Perfil). */
export async function initNotifications(askPermission: boolean): Promise<void> {
  try {
    if (!ready) {
      ready = true;
      await ensureChannels();
      Notifications.addNotificationResponseReceivedListener((r) => {
        const url = r.notification.request.content.data?.url;
        if (typeof url === 'string') router.push(url as never);
      });
    }
    const state = await readPermission();
    if (askPermission && state === 'undetermined') await requestNotificationPermission();
  } catch (e) {
    console.warn('[notify]', e);
  }
}

/** Pide el permiso al sistema (Android 13+ muestra el diálogo). Devuelve si quedó concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureChannels(); // en Android 13 el diálogo solo aparece si ya existe un canal
    const p = await Notifications.requestPermissionsAsync();
    const state: PermissionState = p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
    useNotifications.setState({ permission: state });
    if (p.granted) useNotifications.getState().setEnabled(true);
    return p.granted;
  } catch (e) {
    console.warn('[notify]', e);
    return false;
  }
}

/** Abre los ajustes de la app (si el vecino negó el permiso, solo se puede activar desde ahí). */
export function openNotificationSettings() {
  void Linking.openSettings();
}

/** Revisa el permiso de nuevo (al volver de Ajustes). */
export function refreshNotificationPermission() {
  void readPermission().catch(() => {});
}

/** Clave única del evento "Modo Emergencia activado" (llega por internet y por mesh con horas casi iguales). */
export function zoneEmergencyKey(startedAt: string | number | null | undefined): string {
  const t = startedAt ? new Date(startedAt).getTime() : Date.now();
  return `zone.on.${Math.floor(t / (30 * 60_000))}`;
}

/** Marca un evento como ya notificado (p. ej. la junta que activó la emergencia no se autonotifica). */
export function markNotified(dedupeKey: string) {
  Storage.setItemSync(SENT_PREFIX + dedupeKey, '1');
}

export async function notify(
  title: string,
  body: string,
  opts: { url?: string; channel?: 'emergencia' | 'favores'; dedupeKey?: string } = {},
) {
  try {
    if (!useNotifications.getState().enabled) return;
    if (opts.dedupeKey) {
      // Una sola notificación por evento, aunque llegue por sync, realtime y mesh
      const k = SENT_PREFIX + opts.dedupeKey;
      if (Storage.getItemSync(k)) return;
      Storage.setItemSync(k, '1');
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: opts.url ? { url: opts.url } : {},
        priority: opts.channel === 'emergencia' ? Notifications.AndroidNotificationPriority.MAX : undefined,
      },
      trigger: Platform.OS === 'android' ? { channelId: opts.channel ?? 'favores' } : null,
    });
  } catch (e) {
    console.warn('[notify]', e);
  }
}
