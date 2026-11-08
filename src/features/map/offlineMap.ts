import { OfflineManager } from '@maplibre/maplibre-react-native';
import Storage from 'expo-sqlite/kv-store';
import { MAP_STYLE_URL } from '@/components/QuadraMap';
import { DEMO_CENTER } from '@/lib/geo';

// Paquete offline del barrio demo: ~3 km alrededor de Lince, zoom 12 a 16.
// Pocos cientos de teselas (descarga única, uso razonable del servicio gratuito de OpenFreeMap).

const PACK_NAME = 'lince-demo-v1';
const KEY = 'ayni.offlinePack';

export async function ensureOfflinePack(): Promise<void> {
  if (Storage.getItemSync(KEY) === 'complete') return;
  try {
    const packs = await OfflineManager.getPacks();
    const existing = packs.find((p) => (p.metadata as { name?: string } | undefined)?.name === PACK_NAME);
    if (existing) {
      const status = await existing.status();
      if (status.state === 'complete') {
        Storage.setItemSync(KEY, 'complete');
        return;
      }
      await existing.resume();
      return;
    }
    const d = 0.015; // ≈ 1.6 km en cada dirección
    await OfflineManager.createPack(
      {
        mapStyle: MAP_STYLE_URL,
        bounds: [DEMO_CENTER.lng - d, DEMO_CENTER.lat - d, DEMO_CENTER.lng + d, DEMO_CENTER.lat + d],
        minZoom: 12,
        maxZoom: 16,
        metadata: { name: PACK_NAME },
      },
      (_pack, status) => {
        if (status.state === 'complete') Storage.setItemSync(KEY, 'complete');
      },
      (_pack, err) => console.warn('[offlineMap]', err.message),
    );
  } catch (e) {
    console.warn('[offlineMap] no se pudo crear el paquete', e);
  }
}
