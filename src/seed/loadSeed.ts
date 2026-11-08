import { getDb } from '@/data/db';
import { putLocal } from '@/data/repositories/base';
import { bumpTables } from '@/data/store';
import seed from '@/seed/seed.json';

// Carga los datos demo en SQLite para que la app tenga contenido sin internet.
// Mismos ids que supabase/seed.sql: al sincronizar no se duplican.

const minutesAgoIso = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export async function loadSeedIfEmpty(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM listings');
  if ((row?.n ?? 0) > 0) return false;

  // Fechas en el pasado: así el primer pull del servidor (más nuevo) las reemplaza.
  const old = '2026-01-01T00:00:00.000Z';
  await putLocal('zones', { ...seed.zone, emergency_active: 0, emergency_type: null, emergency_started_at: null, updated_at: old }, 'ignore');
  for (const p of seed.profiles) await putLocal('profiles', { ...p, created_at: old, updated_at: old }, 'ignore');
  for (const l of seed.listings) await putLocal('listings', { ...l, created_at: old, updated_at: old }, 'ignore');
  for (const f of seed.favors) {
    const { minutesAgo, ...rest } = f;
    await putLocal('favors', { ...rest, created_at: minutesAgoIso(minutesAgo), updated_at: old }, 'ignore');
  }
  for (const r of seed.favorResponses) {
    const { minutesAgo, ...rest } = r;
    await putLocal('favor_responses', { ...rest, created_at: minutesAgoIso(minutesAgo), updated_at: old }, 'ignore');
  }
  bumpTables('zones', 'profiles', 'listings', 'favors', 'favor_responses');
  return true;
}

/** Reportes demo del Modo Emergencia: se cargan cuando el modo se activa (prompt.md §8). */
export async function loadEmergencyDemo(): Promise<void> {
  for (const e of seed.emergencyDemo) {
    const { minutesAgo, ...rest } = e;
    const at = minutesAgoIso(minutesAgo);
    await putLocal('emergency_reports', { ...rest, created_at: at, updated_at: at }, 'ignore');
  }
  bumpTables('emergency_reports');
}
