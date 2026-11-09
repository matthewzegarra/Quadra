import { getDb } from '@/data/db';
import { patchRow, putLocal, saveRow } from '@/data/repositories/base';
import { ensureMyProfile } from '@/data/repositories/profiles';
import { bumpTables } from '@/data/store';
import type { EmergencyReport, Profile, ReportKind, ReportStatus, Zone } from '@/data/types';
import { useLocalQuery } from '@/data/useLocalQuery';
import { REPORT_KINDS } from '@/features/catalog';
import { currentUserId, currentUserName, useSession } from '@/features/session/store';
import { distanceMeters, type LatLng } from '@/lib/geo';
import { located, shareHome, sharePoint } from '@/lib/privacy';
import { newId } from '@/lib/ids';
import { markNotified, zoneEmergencyKey } from '@/lib/notify';
import { currentCoords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { DEMO_ZONE_ID } from '@/lib/zone';
import { publishControl, publishReport } from '@/mesh/MeshRouter';
import { loadEmergencyDemo } from '@/seed/loadSeed';

export function useZone() {
  return useLocalQuery<Zone | null>(['zones'], (db) => db.getFirstAsync<Zone>('SELECT * FROM zones WHERE id = ?', [DEMO_ZONE_ID]));
}

/** Estado del Modo Emergencia: oficial (junta vecinal, llega por Realtime o mesh) o abierto localmente (SOS). */
export function useEmergencyMode() {
  const { data: zone } = useZone();
  const local = useSession((s) => s.localEmergency);
  const official = zone?.emergency_active === 1;
  return {
    active: official || local,
    official,
    type: official ? zone?.emergency_type ?? 'otro' : 'otro',
    startedAt: official ? zone?.emergency_started_at ?? null : null,
    zone,
  };
}

export type ReportWithMeta = EmergencyReport & { distance_m: number; mesh_path: string | null };

export function useReports(from: LatLng, kinds?: ReportKind[]) {
  return useLocalQuery<ReportWithMeta[]>(
    ['emergency_reports'],
    async (db) => {
      const rows = await db.getAllAsync<EmergencyReport & { mesh_path: string | null }>(
        `SELECT * FROM emergency_reports
         WHERE coalesce(review_status, 'aprobado') <> 'rechazado'
           AND (coalesce(review_status, 'aprobado') = 'aprobado' OR author_id = ? OR origin = 'mesh')
           ${kinds ? `AND kind IN (${kinds.map(() => '?').join(',')})` : ''}`,
        [currentUserId(), ...(kinds ?? [])],
      );
      const statusRank: Record<ReportStatus, number> = { abierto: 0, atendiendo: 1, resuelto: 2 };
      return rows
        .map((r) => ({ ...r, distance_m: distanceMeters(from, sharePoint(r, r.author_id === currentUserId())) }))
        .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.priority - b.priority || a.distance_m - b.distance_m);
    },
    [from.lat, from.lng, kinds?.join(',')],
  );
}

export function useReport(id: string) {
  return useLocalQuery<(EmergencyReport & { mesh_path: string | null }) | null>(['emergency_reports'], (db) =>
    db.getFirstAsync('SELECT * FROM emergency_reports WHERE id = ?', [id]),
  [id]);
}

/** Vecinos marcados como vulnerables (opt-in) para que los cercanos vayan a verlos. */
export function useVulnerableNeighbors(from: LatLng) {
  return useLocalQuery<(Profile & { distance_m: number })[]>(['profiles', 'emergency_reports'], async (db) => {
    const rows = await db.getAllAsync<Profile>(
      `SELECT * FROM profiles WHERE is_vulnerable = 1 AND home_lat IS NOT NULL AND id <> ?
       AND id NOT IN (SELECT author_id FROM emergency_reports WHERE kind IN ('estoy_bien','vulnerable') AND author_id IS NOT NULL)`,
      [currentUserId()],
    );
    return rows
      .map((p) => {
        const at = shareHome(p, false) ?? { lat: p.home_lat!, lng: p.home_lng! };
        return { ...p, home_lat: at.lat, home_lng: at.lng, distance_m: distanceMeters(from, at) };
      })
      .sort((a, b) => a.distance_m - b.distance_m);
  }, [from.lat, from.lng]);
}

export async function createReport(input: { kind: ReportKind; need?: string | null; description?: string | null; people_count?: number }) {
  const at = currentCoords();
  // El SOS viaja con el punto exacto (para que lo encuentren). Lo demás, con la zona de ~250 m.
  const where = input.kind === 'sos' ? { lat: at.lat, lng: at.lng, public_lat: at.lat, public_lng: at.lng } : located(at);
  const row = {
    id: newId(),
    author_id: currentUserId(),
    author_name: currentUserName(),
    zone_id: DEMO_ZONE_ID,
    kind: input.kind,
    need: input.need ?? null,
    description: input.description?.trim() || null,
    people_count: input.people_count ?? 1,
    priority: REPORT_KINDS[input.kind].priority,
    ...where,
    // Emergencia: sale al instante. La junta revisa después y puede ocultar los falsos (panel Revisión).
    review_status: 'aprobado',
    status: 'abierto',
    origin: 'online',
    mesh_hops: 0,
  };
  const saved = (await saveRow('emergency_reports', row, 'insert')) as unknown as EmergencyReport;
  const peers = await publishReport(saved);
  return { report: saved, peers };
}

export async function setReportStatus(id: string, status: ReportStatus) {
  await patchRow('emergency_reports', id, { status });
}

/** Abre el Modo Emergencia en este celular (botón SOS o pestaña Emergencia). */
export async function openLocalEmergency() {
  useSession.getState().setLocalEmergency(true);
  if (useSession.getState().demoMode) await loadEmergencyDemo();
}

export async function closeLocalEmergency() {
  useSession.getState().setLocalEmergency(false);
}

/** Junta vecinal: activa el modo para toda la zona (Realtime + mesh). */
export async function activateZoneEmergency(type: string) {
  const db = await getDb();
  const zone = await db.getFirstAsync<Zone>('SELECT * FROM zones WHERE id = ?', [DEMO_ZONE_ID]);
  if (!zone) return;
  const startedAt = new Date().toISOString();
  markNotified(zoneEmergencyKey(startedAt)); // quien activa no se autonotifica
  await patchRow('zones', zone.id, { emergency_active: 1, emergency_type: type, emergency_started_at: startedAt });
  await publishControl(true, type);
  if (useSession.getState().demoMode) await loadEmergencyDemo();
}

export async function deactivateZoneEmergency() {
  const db = await getDb();
  const zone = await db.getFirstAsync<Zone>('SELECT * FROM zones WHERE id = ?', [DEMO_ZONE_ID]);
  if (zone) await patchRow('zones', zone.id, { emergency_active: 0 });
  await publishControl(false, zone?.emergency_type ?? 'otro');
  useSession.getState().setLocalEmergency(false);
}

/** Reclama el rol de junta vecinal con el PIN de la zona. Sin internet se valida localmente (demo). */
export async function claimZoneAdmin(pin: string): Promise<boolean> {
  const me = await ensureMyProfile();
  let ok = false;
  if (supabase && useSession.getState().authUserId) {
    const { data, error } = await supabase.rpc('claim_zone_admin', { p_zone: DEMO_ZONE_ID, p_code: pin });
    ok = !error && data === true;
    if (error && !error.code) ok = pin === '2026'; // sin red
  } else {
    ok = pin === '2026';
  }
  if (ok) {
    await putLocal('profiles', { ...me, is_zone_admin: 1 });
    bumpTables('profiles');
  }
  return ok;
}
