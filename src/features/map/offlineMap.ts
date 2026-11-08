import { OfflineManager } from '@maplibre/maplibre-react-native';
import Storage from 'expo-sqlite/kv-store';
import { MAP_STYLE_URL } from '@/components/QuadraMap';
import { currentCoords, useLocationStore } from '@/lib/location';

// Paquete offline del barrio donde está el vecino: ~3 km alrededor, zoom 12 a 16.
// Pocos cientos de teselas por barrio (descarga única, uso razonable del servicio gratuito de OpenFreeMap).
// El nombre se arma con el centro redondeado (~1 km): si el vecino se queda en su barrio, no se repite.

const KEY_PREFIX = 'ayni.offlinePack.';

function packNameFor(lat: number, lng: number): string {
  return `barrio-${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export async function ensureOfflinePack(): Promise<void> {
  // Sin GPS aún no sabemos qué barrio guardar (salvo que el vecino eligió el barrio demo)
  const loc = useLocationStore.getState();
  if (!loc.simulateDemo && loc.source !== 'gps') return;
  const center = currentCoords();
  const name = packNameFor(center.lat, center.lng);
  const key = KEY_PREFIX + name;
  if (Storage.getItemSync(key) === 'complete') return;
  try {
    const packs = await OfflineManager.getPacks();
    const existing = packs.find((p) => (p.metadata as { name?: string } | undefined)?.name === name);
    if (existing) {
      const status = await existing.status();
      if (status.state === 'complete') {
        Storage.setItemSync(key, 'complete');
        return;
      }
      await existing.resume();
      return;
    }
    const d = 0.015; // ≈ 1.6 km en cada dirección
    await OfflineManager.createPack(
      {
        mapStyle: MAP_STYLE_URL,
        bounds: [center.lng - d, center.lat - d, center.lng + d, center.lat + d],
        minZoom: 12,
        maxZoom: 16,
        metadata: { name },
      },
      (_pack, status) => {
        if (status.state === 'complete') Storage.setItemSync(key, 'complete');
      },
      (_pack, err) => console.warn('[offlineMap]', err.message),
    );
  } catch (e) {
    console.warn('[offlineMap] no se pudo crear el paquete', e);
  }
}
