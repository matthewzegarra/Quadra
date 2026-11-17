import type { Zone } from '@/data/types';

// Lógica pura del Modo Emergencia (sin React ni SQLite) para poder probarla: scripts/test-logic.mjs

/** Clave de la emergencia oficial en curso: si la junta la reactiva, cambia y vuelve a mostrarse. */
export function emergencyKey(zone: Pick<Zone, 'emergency_started_at'> | null | undefined): string {
  return zone?.emergency_started_at ?? 'activa';
}

/** ¿Está activo el modo en este celular? Oficial (junta) salvo que el vecino lo haya ocultado, o local (SOS). */
export function computeEmergencyMode(
  zone: Pick<Zone, 'emergency_active' | 'emergency_type' | 'emergency_started_at'> | null | undefined,
  local: boolean,
  dismissedKey: string | null,
) {
  const official = zone?.emergency_active === 1;
  const dismissed = official && dismissedKey === emergencyKey(zone);
  return {
    active: (official && !dismissed) || local,
    official,
    dismissed,
    type: official ? zone?.emergency_type ?? 'otro' : 'otro',
    startedAt: official ? zone?.emergency_started_at ?? null : null,
  };
}
