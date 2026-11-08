import { useSession } from '@/features/session/store';
import { PUBLIC_GRID_M, roundLocation, type LatLng } from '@/lib/geo';

export type ReviewStatus = 'pendiente' | 'aprobado' | 'rechazado';

/** Modo demo publica directo. Apagado, la junta vecinal aprueba antes. */
export function reviewForNewPost(): ReviewStatus {
  return useSession.getState().demoMode ? 'aprobado' : 'pendiente';
}

export function publicCoords(p: LatLng): { public_lat: number; public_lng: number } {
  const r = roundLocation(p, PUBLIC_GRID_M);
  return { public_lat: r.lat, public_lng: r.lng };
}

export function located(p: LatLng): LatLng & { public_lat: number; public_lng: number } {
  return { lat: p.lat, lng: p.lng, ...publicCoords(p) };
}

type Located = { lat: number; lng: number; public_lat?: number | null; public_lng?: number | null };

/** Casa que se puede mostrar. La propia va exacta; la de otro vecino, en la zona. */
export function shareHome(
  row: { home_lat: number | null; home_lng: number | null; public_home_lat?: number | null; public_home_lng?: number | null },
  mine: boolean,
): LatLng | null {
  if (row.home_lat == null || row.home_lng == null) return null;
  if (mine) return { lat: row.home_lat, lng: row.home_lng };
  if (row.public_home_lat != null && row.public_home_lng != null) return { lat: row.public_home_lat, lng: row.public_home_lng };
  return roundLocation({ lat: row.home_lat, lng: row.home_lng }, PUBLIC_GRID_M);
}

/** Punto que se puede mostrar. Lo propio va exacto; lo demás, en la zona de ~250 m. */
export function sharePoint(row: Located, mine: boolean): LatLng {
  if (mine) return { lat: row.lat, lng: row.lng };
  if (row.public_lat != null && row.public_lng != null) return { lat: row.public_lat, lng: row.public_lng };
  return roundLocation(row, PUBLIC_GRID_M);
}
