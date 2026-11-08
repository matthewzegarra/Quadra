import { getDb } from '@/data/db';
import { saveRow } from '@/data/repositories/base';
import { bumpTables } from '@/data/store';
import type { Profile } from '@/data/types';
import { currentUserId, useSession } from '@/features/session/store';
import { currentCoords } from '@/lib/location';
import { DEMO_ZONE_ID } from '@/lib/zone';

export async function getProfile(id: string): Promise<Profile | null> {
  const db = await getDb();
  return db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
}

export async function getMyProfile(): Promise<Profile | null> {
  return getProfile(currentUserId());
}

/** Crea el perfil local si no existe (casa = ubicación actual, zona demo). */
export async function ensureMyProfile(): Promise<Profile> {
  const existing = await getMyProfile();
  if (existing) return existing;
  const { displayName } = useSession.getState();
  const home = currentCoords();
  const row = {
    id: currentUserId(),
    display_name: displayName ?? 'Vecino',
    phone_whatsapp: useSession.getState().whatsapp,
    zone_id: DEMO_ZONE_ID,
    home_lat: home.lat,
    home_lng: home.lng,
    is_zone_admin: 0,
    is_vulnerable: 0,
    aynis: 0,
    easy_mode: useSession.getState().easyMode ? 1 : 0,
  };
  await saveRow('profiles', row);
  return (await getMyProfile())!;
}

/** Actualiza campos del perfil propio (se sube completo con upsert). */
export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const me = await ensureMyProfile();
  await saveRow('profiles', { ...me, ...patch, id: me.id });
}

// Columnas que guardan el id del vecino en cada tabla.
const USER_COLUMNS: [string, string][] = [
  ['profiles', 'id'],
  ['listings', 'owner_id'],
  ['vistos_buenos', 'voter_id'],
  ['favors', 'author_id'],
  ['favor_responses', 'responder_id'],
  ['emergency_reports', 'author_id'],
  ['ayni_ledger', 'user_id'],
];

/**
 * Cuando por fin hay sesión de Supabase, lo creado sin conexión con el id local
 * pasa a usar el id de Supabase (requisito de RLS: owner_id = auth.uid()).
 */
export async function remapIdentity(localId: string, authId: string): Promise<void> {
  if (localId === authId) return;
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const [table, col] of USER_COLUMNS) {
      if (table === 'profiles') {
        // Si ya existe el perfil remoto, borramos el local duplicado
        const remote = await txn.getFirstAsync('SELECT id FROM profiles WHERE id = ?', [authId]);
        if (remote) await txn.runAsync('DELETE FROM profiles WHERE id = ?', [localId]);
        else await txn.runAsync('UPDATE profiles SET id = ? WHERE id = ?', [authId, localId]);
        continue;
      }
      await txn.runAsync(`UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`, [authId, localId]);
    }
    await txn.runAsync('UPDATE outbox SET payload = REPLACE(payload, ?, ?)', [localId, authId]);
  });
  bumpTables(...USER_COLUMNS.map(([t]) => t));
}
