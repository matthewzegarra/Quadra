import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getDb } from '@/data/db';
import { refreshPendingCount } from '@/data/repositories/base';
import { useEmergencyMode } from '@/data/repositories/emergency';
import { ensureMyProfile, fixLegacyDemoHome, getMyProfile, remapIdentity, updateMyProfile } from '@/data/repositories/profiles';
import { onIncomingRow, setSyncInterval, startSyncEngine, syncNow } from '@/data/sync/SyncEngine';
import type { Favor } from '@/data/types';
import { EMERGENCY_TYPES, firstName } from '@/features/catalog';
import { ensureOfflinePack } from '@/features/map/offlineMap';
import { currentUserId, useSession } from '@/features/session/store';
import { startConnectivityListener, useConnectivity } from '@/lib/connectivity';
import { refreshLocation, useLocationStore } from '@/lib/location';
import { initNotifications, notify, zoneEmergencyKey } from '@/lib/notify';
import { restoreSession } from '@/lib/supabase';
import { startMesh, stopMesh } from '@/mesh/MeshRouter';
import { loadSeedIfEmpty } from '@/seed/loadSeed';

let authInFlight: Promise<void> | null = null;

/** El Modo demo (activo de fábrica) tiene que estar en el servidor para publicar sin cola. */
async function syncDemoFlag() {
  if (!useSession.getState().demoMode) return;
  const me = await getMyProfile();
  if (me && me.demo_mode !== 1) await updateMyProfile({ demo_mode: 1 });
}

/** Si ya hay cuenta, remapea lo creado offline y sincroniza. No crea una sesión anónima. */
function connectBackend(): Promise<void> {
  if (authInFlight) return authInFlight;
  authInFlight = (async () => {
    const s = useSession.getState();
    const authId = await restoreSession();
    if (!authId) return;
    if (s.authUserId !== authId) {
      await remapIdentity(s.localUserId, authId);
      useSession.getState().setAuthUserId(authId);
    }
    if (useSession.getState().displayName) {
      await ensureMyProfile();
      await syncDemoFlag();
    }
    startSyncEngine();
  })().finally(() => {
    authInFlight = null;
  });
  return authInFlight;
}

/** Arranque (se llama una vez con la base local lista). */
export async function bootstrap(): Promise<void> {
  await getDb();
  await loadSeedIfEmpty();
  await refreshPendingCount();
  void refreshLocation().then(async () => {
    if (!useSession.getState().onboardingDone) return;
    await ensureMyProfile();
    await fixLegacyDemoHome();
    await syncDemoFlag();
  });
  void initNotifications(useSession.getState().onboardingDone);
  void connectBackend();
}

/** Efectos globales de la app mientras está abierta. */
export function useAppEffects() {
  const isOnline = useConnectivity((s) => s.isOnline);
  const meshEnabled = useSession((s) => s.meshEnabled);
  const { active: emergency } = useEmergencyMode();

  // Conectividad: al volver la señal, sincronizar
  useEffect(
    () =>
      startConnectivityListener(() => {
        void connectBackend().then(() => syncNow());
        void ensureOfflinePack();
      }),
    [],
  );

  // Mapa offline del barrio donde está el vecino (se baja una vez por barrio, ~1 km de cuadrícula)
  const areaKey = useLocationStore((s) => (s.source === 'gps' || s.simulateDemo ? `${s.coords.lat.toFixed(2)}_${s.coords.lng.toFixed(2)}` : null));
  useEffect(() => {
    if (isOnline && areaKey) void ensureOfflinePack();
  }, [isOnline, areaKey]);

  // Al volver a la app, medir de nuevo la ubicación real (como mucho cada 2 min)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const at = useLocationStore.getState().updatedAt ?? 0;
      if (st === 'active' && Date.now() - at > 120_000) void refreshLocation();
    });
    return () => sub.remove();
  }, []);

  // En emergencia sincronizamos más seguido
  useEffect(() => {
    setSyncInterval(emergency ? 10_000 : 30_000);
  }, [emergency]);

  // Mesh: se activa solo en emergencia o sin internet; también con el switch manual
  useEffect(() => {
    const shouldRun = emergency || !isOnline || meshEnabled;
    if (shouldRun) void startMesh();
    else void stopMesh();
  }, [emergency, isOnline, meshEnabled]);

  // Notificaciones locales a partir de lo que llega del servidor (pull o Realtime)
  useEffect(
    () =>
      onIncomingRow(async (table, row, isNew) => {
        const me = currentUserId();
        const recent = (iso: unknown, maxMin: number) =>
          typeof iso === 'string' && Date.now() - new Date(iso).getTime() < maxMin * 60_000;

        // Alguien ofrece ayuda a un favor mío
        if (table === 'favor_responses' && isNew && row.responder_id !== me) {
          const db = await getDb();
          const favor = await db.getFirstAsync<Favor>('SELECT * FROM favors WHERE id = ?', [row.favor_id as string]);
          if (favor?.author_id !== me) return;
          notify(`${row.responder_name ?? 'Un vecino'} te ofrece ayuda`, `"${row.message ?? 'Yo te ayudo'}" · ${favor.title}`, {
            url: `/favor/${favor.id}`,
            channel: 'favores',
            dedupeKey: `offer.${row.id}`,
          });
          return;
        }

        // Me eligieron para ayudar
        if (table === 'favor_responses' && row.responder_id === me && row.status === 'aceptado' && recent(row.updated_at, 120)) {
          const db = await getDb();
          const favor = await db.getFirstAsync<Favor>('SELECT * FROM favors WHERE id = ?', [row.favor_id as string]);
          notify('¡Te eligieron para ayudar!', `${favor?.title ?? 'Un vecino'} · coordina por WhatsApp`, {
            url: `/favor/${row.favor_id}`,
            channel: 'favores',
            dedupeKey: `accepted.${row.id}`,
          });
          return;
        }

        // La junta vecinal activó el Modo Emergencia
        if (table === 'zones' && row.emergency_active && recent(row.emergency_started_at, 180)) {
          const type = EMERGENCY_TYPES.find((t) => t.key === row.emergency_type)?.label ?? 'Emergencia';
          notify(`Modo Emergencia · ${type}`, 'La junta vecinal activó el Modo Emergencia. Toca para ver el tablero.', {
            url: '/emergencia',
            channel: 'emergencia',
            dedupeKey: zoneEmergencyKey(row.emergency_started_at as string),
          });
          return;
        }

        // SOS o vecino vulnerable que llegó por internet (los del mesh ya notifican en MeshRouter)
        if (
          table === 'emergency_reports' &&
          isNew &&
          row.author_id !== me &&
          (row.kind === 'sos' || row.kind === 'vulnerable') &&
          recent(row.created_at, 60)
        ) {
          notify(
            `SOS · ${firstName((row.author_name as string) ?? 'Un vecino')} necesita ayuda`,
            `${(row.description as string) ?? (row.need as string) ?? 'Pide ayuda'} · vía internet`,
            { url: `/emergencia/recibido/${row.id}`, channel: 'emergencia', dedupeKey: `report.${row.id}` },
          );
        }
      }),
    [],
  );
}
