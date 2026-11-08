// Utilidades geográficas. Una sola fuente de verdad para distancias en toda la app.

export type LatLng = { lat: number; lng: number };

/** Una cuadra urbana en Lima ≈ 100 m. */
export const METERS_PER_BLOCK = 100;
/** Velocidad de caminata ≈ 80 m/min. */
export const WALK_METERS_PER_MIN = 80;
/** Radio "A pie" y regla del Visto Bueno Vecinal. */
export const WALKING_RADIUS_M = 1500;

/** Centro del barrio demo: Lince, Lima. */
export const DEMO_CENTER: LatLng = { lat: -12.0846, lng: -77.0353 };

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en metros entre dos puntos (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));
}

export function blocks(meters: number): number {
  return Math.max(1, Math.round(meters / METERS_PER_BLOCK));
}

/** "120 m" o "1.2 km". */
export function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Formato estándar de la app: "120 m · 2 min a pie". */
export function formatDistance(meters: number): string {
  return `${formatMeters(meters)} · ${walkingMinutes(meters)} min a pie`;
}

/** Variante en cuadras: "a 3 cuadras · 4 min a pie". */
export function formatBlocks(meters: number): string {
  const b = blocks(meters);
  return `a ${b} ${b === 1 ? 'cuadra' : 'cuadras'} · ${walkingMinutes(meters)} min a pie`;
}

/** Redondea una ubicación a una cuadrícula de ~50 m (privacidad antes de aceptar una oferta). */
export function roundLocation(p: LatLng, gridMeters = 50): LatLng {
  const latStep = gridMeters / 111_320;
  const lngStep = gridMeters / (111_320 * Math.cos(toRad(p.lat)));
  return {
    lat: Math.round(p.lat / latStep) * latStep,
    lng: Math.round(p.lng / lngStep) * lngStep,
  };
}

export function isWithinWalking(a: LatLng, b: LatLng): boolean {
  return distanceMeters(a, b) <= WALKING_RADIUS_M;
}
