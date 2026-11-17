import { create } from 'zustand';
import { getDb } from '@/data/db';
import { useDataVersion } from '@/data/store';
import type { Zone } from '@/data/types';
import { DEMO_ZONE_ID } from '@/lib/zone';

// Estado de la zona (incluye si la junta activó el Modo Emergencia) en memoria y SÍNCRONO.
//
// Por qué existe (bug de la presentación del 10/11): antes cada layout leía la zona de SQLite
// al montarse, de forma asíncrona. En el primer render la zona era `undefined`, así que el
// layout de emergencia creía que el modo estaba apagado y redirigía al inicio; el inicio cargaba
// la zona, veía la emergencia y redirigía otra vez a emergencia… un bucle infinito de
// redirecciones (montando el mapa en cada vuelta) que congelaba la app en todos los celulares.
// Como el indicador queda guardado en SQLite, sin internet la app no volvía a abrir.
// Con este store todas las pantallas leen el mismo valor en el mismo render: no hay bucle.

type ZoneState = { zone: Zone | null; loaded: boolean };

export const useZoneStore = create<ZoneState>(() => ({ zone: null, loaded: false }));

export async function reloadZone(): Promise<void> {
  try {
    const db = await getDb();
    const zone = await db.getFirstAsync<Zone>('SELECT * FROM zones WHERE id = ?', [DEMO_ZONE_ID]);
    useZoneStore.setState({ zone: zone ?? null, loaded: true });
  } catch (e) {
    console.warn('[zone]', e);
    useZoneStore.setState({ loaded: true });
  }
}

let watching = false;

/** Recarga la zona cada vez que alguien escribe en la tabla `zones` (sync, Realtime, mesh, junta). */
export function watchZone(): void {
  if (watching) return;
  watching = true;
  let last = useDataVersion.getState().versions.zones ?? 0;
  useDataVersion.subscribe((s) => {
    const v = s.versions.zones ?? 0;
    if (v === last) return;
    last = v;
    void reloadZone();
  });
}
