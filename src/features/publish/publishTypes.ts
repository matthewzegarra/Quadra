import type { Ionicons } from '@expo/vector-icons';
import type { ParsedPost } from '@/features/voice/parseVoiceOffline';
import { colors } from '@/theme/tokens';

export type PublishTipo = 'servicio' | 'producto' | 'pido' | 'presto' | 'movilidad' | 'emergencia';

export const PUBLISH_TILES: { tipo: PublishTipo; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { tipo: 'servicio', label: 'Ofrezco un servicio', icon: 'construct-outline', color: colors.primary, bg: colors.primarySoft },
  { tipo: 'producto', label: 'Vendo un producto', icon: 'restaurant-outline', color: colors.accentInk, bg: colors.accentSoft },
  { tipo: 'pido', label: 'Pido una mano', icon: 'heart-outline', color: colors.catPurple, bg: '#ECE6FA' },
  { tipo: 'presto', label: 'Presto o dono', icon: 'cube-outline', color: colors.inkSoft, bg: colors.surfaceMuted },
  { tipo: 'movilidad', label: 'Movilidad solidaria', icon: 'car-outline', color: '#1E4E8C', bg: '#E1EBF7' },
  { tipo: 'emergencia', label: 'Emergencia', icon: 'warning-outline', color: colors.white, bg: 'rgba(255,255,255,0.18)' },
];

/** A qué pantalla de confirmación lleva lo que se dijo por voz. */
export function tipoFromParsed(p: ParsedPost): PublishTipo {
  if (p.module === 'emergency') return 'emergencia';
  if (p.module === 'listing') return p.kind === 'producto' ? 'producto' : 'servicio';
  if (p.type === 'movilidad') return 'movilidad';
  if (p.type === 'pido') return 'pido';
  return 'presto';
}
