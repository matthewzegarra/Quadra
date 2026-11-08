import type { Ionicons } from '@expo/vector-icons';
import type { FavorType, ReportKind } from '@/data/types';
import { colors } from '@/theme/tokens';

// Catálogos de la app: categorías, tipos de favor, recursos de emergencia.
// Siempre ícono + texto + color (accesibilidad, prompt.md §7).

type Icon = keyof typeof Ionicons.glyphMap;
export type CatalogItem = { key: string; label: string; icon: Icon; color: string; bg: string };

export const LISTING_CATEGORIES: CatalogItem[] = [
  { key: 'gasfiteria', label: 'Gasfitería', icon: 'construct-outline', color: colors.primary, bg: colors.primarySoft },
  { key: 'comida', label: 'Comida casera', icon: 'restaurant-outline', color: colors.accentInk, bg: colors.accentSoft },
  { key: 'electricidad', label: 'Electricidad', icon: 'flash-outline', color: '#8A5A12', bg: '#FBEFD9' },
  { key: 'cerrajeria', label: 'Cerrajería', icon: 'key-outline', color: '#3D3A35', bg: '#EFEAE0' },
  { key: 'carpinteria', label: 'Carpintería', icon: 'hammer-outline', color: '#7A4B1E', bg: '#F3E6D6' },
  { key: 'clases', label: 'Clases', icon: 'book-outline', color: colors.catPurple, bg: '#ECE6FA' },
  { key: 'mascotas', label: 'Mascotas', icon: 'paw-outline', color: '#1E5AA8', bg: '#E1EBF7' },
  { key: 'salud', label: 'Salud', icon: 'medkit-outline', color: colors.danger, bg: colors.dangerSoft },
  { key: 'transporte', label: 'Transporte', icon: 'car-outline', color: '#1E5AA8', bg: '#E1EBF7' },
  { key: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-circle-outline', color: colors.textSecondary, bg: colors.surfaceMuted },
];

export const FAVOR_CATEGORIES: CatalogItem[] = [
  { key: 'herramientas', label: 'Herramientas', icon: 'hammer-outline', color: '#3D3A35', bg: '#EFEAE0' },
  { key: 'salud', label: 'Salud', icon: 'medkit-outline', color: colors.danger, bg: colors.dangerSoft },
  { key: 'materiales', label: 'Materiales', icon: 'cube-outline', color: '#3D3A35', bg: '#EFEAE0' },
  { key: 'habilidades', label: 'Habilidades', icon: 'school-outline', color: colors.catPurple, bg: '#ECE6FA' },
  { key: 'cuidado', label: 'Cuidado', icon: 'heart-outline', color: colors.primary, bg: colors.primarySoft },
  { key: 'movilidad', label: 'Movilidad', icon: 'car-outline', color: '#1E5AA8', bg: '#E1EBF7' },
  { key: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-circle-outline', color: colors.textSecondary, bg: colors.surfaceMuted },
];

export const FAVOR_TYPES: Record<FavorType, { label: string; filter: string; color: string; bg: string; icon: Icon }> = {
  pido: { label: 'Pide', filter: 'Piden', color: colors.catPurple, bg: '#ECE6FA', icon: 'hand-left-outline' },
  ofrezco: { label: 'Ofrece', filter: 'Ofrecen', color: colors.primary, bg: colors.primarySoft, icon: 'heart-outline' },
  presto: { label: 'Presta', filter: 'Prestan', color: '#3D3A35', bg: '#EFEAE0', icon: 'cube-outline' },
  dono: { label: 'Dona', filter: 'Donan', color: colors.accentInk, bg: colors.accentSoft, icon: 'gift-outline' },
  intercambio: { label: 'Intercambio', filter: 'Intercambio', color: '#7A4B1E', bg: '#F3E6D6', icon: 'swap-horizontal-outline' },
  movilidad: { label: 'Movilidad', filter: 'Movilidad', color: '#1E4E8C', bg: '#E1EBF7', icon: 'car-outline' },
};

export const NEEDS: CatalogItem[] = [
  { key: 'agua', label: 'Agua', icon: 'water-outline', color: '#1E4E8C', bg: '#E1EBF7' },
  { key: 'baldes', label: 'Baldes', icon: 'trash-bin-outline', color: colors.ink, bg: colors.surfaceMuted },
  { key: 'medicinas', label: 'Medicinas', icon: 'medkit-outline', color: colors.danger, bg: colors.dangerSoft },
  { key: 'refugio', label: 'Refugio', icon: 'home-outline', color: colors.inkSoft, bg: colors.surfaceMuted },
  { key: 'energia', label: 'Energía', icon: 'flash-outline', color: '#8A5A12', bg: '#FBEFD9' },
  { key: 'comida', label: 'Comida', icon: 'restaurant-outline', color: colors.accentInk, bg: colors.accentSoft },
  { key: 'abrigo', label: 'Abrigo', icon: 'shirt-outline', color: colors.catPurple, bg: '#ECE6FA' },
  { key: 'rescate', label: 'Rescate', icon: 'alert-circle-outline', color: colors.danger, bg: colors.dangerSoft },
];

export const REPORT_KINDS: Record<ReportKind, { label: string; color: string; priority: number; icon: Icon }> = {
  sos: { label: 'SOS', color: colors.danger, priority: 1, icon: 'warning' },
  vulnerable: { label: 'Vecino vulnerable', color: colors.vulnerable, priority: 1, icon: 'accessibility' },
  recurso_necesito: { label: 'Necesita recurso', color: colors.need, priority: 2, icon: 'water' },
  recurso_ofrezco: { label: 'Ofrece recurso', color: colors.primary, priority: 3, icon: 'gift' },
  estoy_bien: { label: 'Está bien', color: colors.ok, priority: 3, icon: 'checkmark' },
};

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Alta', 2: 'Media', 3: 'Baja' };

export const EMERGENCY_TYPES = [
  { key: 'sismo', label: 'Sismo' },
  { key: 'inundacion', label: 'Inundación' },
  { key: 'incendio', label: 'Incendio' },
  { key: 'otro', label: 'Otro' },
] as const;

export function findItem(list: CatalogItem[], key: string | null | undefined): CatalogItem {
  return list.find((c) => c.key === key) ?? list[list.length - 1];
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.replace(/^(Don|Doña|Prof\.|Sr\.|Sra\.)\s+/i, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function firstName(name: string | null | undefined): string {
  if (!name) return 'Vecino';
  return name.replace(/^(Prof\.)\s+/i, '').split(/\s+/).slice(0, name.startsWith('Don') ? 2 : 1).join(' ');
}

/** "hace 20 min", "hace 1 h", "hace 2 días". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `hace ${Math.max(1, Math.round(s))} s`;
  const m = s / 60;
  if (m < 60) return `hace ${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `hace ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}
