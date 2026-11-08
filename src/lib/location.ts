import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';
import { Linking } from 'react-native';
import { create } from 'zustand';
import { DEMO_CENTER, type LatLng } from '@/lib/geo';

// Ubicación REAL del vecino (GPS). Nunca la reemplazamos en silencio:
// - Sin GPS todavía: usamos el último punto real guardado en el celular.
// - Sin permiso y sin punto guardado: mostramos el barrio demo, marcado como tal.
// - "Ver el barrio demo (Lince)" es una opción explícita (Perfil o pantalla vacía), apagada por defecto.

const K = {
  last: 'quadra.lastCoords',
  lastLabel: 'quadra.lastLabel',
  simulate: 'quadra.simulateDemo',
} as const;

export type LocationSource = 'gps' | 'last' | 'demo';

type LocationState = {
  coords: LatLng;
  /** gps: recién medida · last: última medida guardada · demo: barrio demo (Lince). */
  source: LocationSource;
  accuracy: number | null;
  /** Dirección aproximada: "Av. Arequipa 2450, Lince". */
  label: string | null;
  permission: 'granted' | 'denied' | 'unknown';
  locating: boolean;
  /** El vecino eligió ver el barrio demo (Lince) en vez de su ubicación. */
  simulateDemo: boolean;
  updatedAt: number | null;
};

function readLast(): { coords: LatLng; label: string | null } | null {
  try {
    const raw = Storage.getItemSync(K.last);
    if (!raw) return null;
    const p = JSON.parse(raw) as LatLng;
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
    return { coords: p, label: Storage.getItemSync(K.lastLabel) };
  } catch {
    return null;
  }
}

const DEMO_LABEL = 'Lince · barrio demo';
const initialSimulate = Storage.getItemSync(K.simulate) === '1';
const initialLast = readLast();

export const useLocationStore = create<LocationState>(() => ({
  coords: initialSimulate || !initialLast ? DEMO_CENTER : initialLast.coords,
  source: initialSimulate || !initialLast ? 'demo' : 'last',
  accuracy: null,
  label: initialSimulate || !initialLast ? DEMO_LABEL : initialLast.label,
  permission: 'unknown',
  locating: false,
  simulateDemo: initialSimulate,
  updatedAt: null,
}));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

function applyReal(coords: LatLng, accuracy: number | null, source: LocationSource) {
  Storage.setItemSync(K.last, JSON.stringify(coords));
  if (useLocationStore.getState().simulateDemo) {
    // Guardamos el punto real, pero el vecino pidió ver el barrio demo
    useLocationStore.setState({ updatedAt: Date.now() });
    return;
  }
  useLocationStore.setState({ coords, source, accuracy, updatedAt: Date.now() });
  // Dirección aproximada (puede fallar sin internet: no es crítico)
  void reverseLabel(coords).then((label) => {
    if (!label || useLocationStore.getState().simulateDemo) return;
    Storage.setItemSync(K.lastLabel, label);
    useLocationStore.setState({ label });
  });
}

let inFlight: Promise<LocationState> | null = null;

/** Pide permiso (si falta) y mide la ubicación real. Seguro de llamar varias veces. */
export function refreshLocation(): Promise<LocationState> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    useLocationStore.setState({ locating: true });
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        useLocationStore.setState({ permission: 'denied' });
        return useLocationStore.getState();
      }
      useLocationStore.setState({ permission: 'granted' });

      // 1) Rápido: la última posición que conoce Android (si es reciente)
      const quick = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 }).catch(() => null);
      if (quick) applyReal({ lat: quick.coords.latitude, lng: quick.coords.longitude }, roundAcc(quick.coords.accuracy), 'gps');

      // 2) Preciso: GPS actual (con tope de tiempo para no colgar la app)
      const pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 12_000).catch(() => null);
      if (pos) applyReal({ lat: pos.coords.latitude, lng: pos.coords.longitude }, roundAcc(pos.coords.accuracy), 'gps');
      else if (!quick) {
        const stale = await Location.getLastKnownPositionAsync().catch(() => null);
        if (stale) applyReal({ lat: stale.coords.latitude, lng: stale.coords.longitude }, roundAcc(stale.coords.accuracy), 'last');
      }
    } catch (e) {
      console.warn('[location]', e);
    } finally {
      useLocationStore.setState({ locating: false });
    }
    return useLocationStore.getState();
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

const roundAcc = (a: number | null | undefined) => (a ? Math.round(a) : null);

/** Ver el barrio demo (Lince) en vez de la ubicación real. Se puede volver con un toque. */
export function setSimulateDemo(on: boolean) {
  Storage.setItemSync(K.simulate, on ? '1' : '0');
  if (on) {
    useLocationStore.setState({ simulateDemo: true, coords: DEMO_CENTER, source: 'demo', accuracy: null, label: DEMO_LABEL });
    return;
  }
  const last = readLast();
  useLocationStore.setState({
    simulateDemo: false,
    coords: last?.coords ?? DEMO_CENTER,
    source: last ? 'last' : 'demo',
    label: last ? last.label : DEMO_LABEL,
  });
  void refreshLocation();
}

/** Si el vecino negó el permiso: volver a pedirlo o abrir Ajustes de Android. */
export async function askLocationAgain(): Promise<void> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted' && !perm.canAskAgain) {
    await Linking.openSettings();
    return;
  }
  await refreshLocation();
}

export async function reverseLabel(p: LatLng): Promise<string | null> {
  try {
    const res = await withTimeout(Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng }), 4000);
    const a = res?.[0];
    if (!a) return null;
    const street = [a.street, a.streetNumber].filter(Boolean).join(' ');
    return [street || a.name, a.district || a.subregion || a.city].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

/** Texto corto para mostrar dónde estás: dirección, "Tu ubicación" o el barrio demo. */
export function locationText(s: Pick<LocationState, 'source' | 'label'>): string {
  if (s.source === 'demo') return DEMO_LABEL;
  return s.label ?? 'Tu ubicación';
}

export function currentCoords(): LatLng {
  return useLocationStore.getState().coords;
}
