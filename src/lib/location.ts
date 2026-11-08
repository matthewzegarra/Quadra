import * as Location from 'expo-location';
import { create } from 'zustand';
import { DEMO_CENTER, distanceMeters, type LatLng } from '@/lib/geo';

// Ubicación del vecino. Si el GPS falla o estás a más de 5 km del barrio demo (Lince),
// usamos el centro de Lince para que la demo funcione en cualquier lugar.

const DEMO_RADIUS_M = 5000;

type LocationState = {
  coords: LatLng;
  source: 'gps' | 'demo';
  accuracy: number | null;
  label: string | null;
  permission: 'granted' | 'denied' | 'unknown';
  updatedAt: number | null;
};

export const useLocationStore = create<LocationState>(() => ({
  coords: DEMO_CENTER,
  source: 'demo',
  accuracy: null,
  label: 'Lince',
  permission: 'unknown',
  updatedAt: null,
}));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

export async function refreshLocation(): Promise<LocationState> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      useLocationStore.setState({ permission: 'denied', source: 'demo', coords: DEMO_CENTER, label: 'Lince' });
      return useLocationStore.getState();
    }
    useLocationStore.setState({ permission: 'granted' });
    const pos =
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000)) ??
      (await Location.getLastKnownPositionAsync());
    if (!pos) return useLocationStore.getState();

    const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (distanceMeters(gps, DEMO_CENTER) > DEMO_RADIUS_M) {
      // Fuera del barrio demo: ubicación simulada en Lince
      useLocationStore.setState({ coords: DEMO_CENTER, source: 'demo', accuracy: null, label: 'Lince', updatedAt: Date.now() });
      return useLocationStore.getState();
    }
    useLocationStore.setState({
      coords: gps,
      source: 'gps',
      accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
      updatedAt: Date.now(),
    });
    // Dirección aproximada (puede fallar sin internet: no es crítico)
    reverseLabel(gps).then((label) => label && useLocationStore.setState({ label }));
  } catch (e) {
    console.warn('[location]', e);
  }
  return useLocationStore.getState();
}

export async function reverseLabel(p: LatLng): Promise<string | null> {
  try {
    const res = await withTimeout(Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng }), 4000);
    const a = res?.[0];
    if (!a) return null;
    const street = [a.street, a.streetNumber].filter(Boolean).join(' ');
    return [street || a.name, a.district || a.city].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

export function currentCoords(): LatLng {
  return useLocationStore.getState().coords;
}
