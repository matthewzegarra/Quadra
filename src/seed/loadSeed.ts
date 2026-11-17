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

/**
 * Modo demo: los favores de ejemplo (Don Pedro y sus muletas, el taladro…) se muestran como recién
 * publicados ("hace 20 min") y no con la fecha en que se instaló la app o se cargó el servidor
 * ("hace 10 días"), que en la presentación parecía un error de fechas.
 */
export async function refreshDemoTimes(): Promise<void> {
  const db = await getDb();
  for (const f of seed.favors) {
    await db.runAsync('UPDATE favors SET created_at = ? WHERE id = ?', [minutesAgoIso(f.minutesAgo), f.id]);
  }
  for (const r of seed.favorResponses) {
    await db.runAsync('UPDATE favor_responses SET created_at = ? WHERE id = ?', [minutesAgoIso(r.minutesAgo), r.id]);
  }
  bumpTables('favors', 'favor_responses');
}
