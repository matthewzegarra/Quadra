// Tokens de diseño de Quadra (fuente: design/pantallas/*.dc.html y prompt.md §0).

export const colors = {
  // Marca Quadra (logo): verde bosque #123023 + lima #CEED68
  primary: '#123023', // verde Quadra: acción principal (texto blanco encima, contraste AAA)
  primaryDark: '#0B2018',
  primarySoft: '#E4EEE7', // fondos de badges "Visto Bueno Vecinal"
  accent: '#CEED68', // lima Quadra: Publicar y destacados (siempre con texto oscuro encima)
  accentSoft: '#F1F9D6',
  accentInk: '#3E5210', // texto sobre lima suave (contraste AA)
  danger: '#B42318', // rojo emergencia / SOS
  dangerSoft: '#FDE8E4',
  ok: '#1E6B45', // "Estoy bien"
  vulnerable: '#F08A24', // naranja vulnerable
  need: '#E8B90F', // amarillo: necesita recurso
  bg: '#F8FAF5', // fondo general
  bgEmergency: '#FFF7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#ECF0E8', // banners, celdas de mapa
  ink: '#1C1B19', // texto principal
  inkSoft: '#3D3A35',
  textSecondary: '#5C574F',
  border: '#DFE5DA',
  borderStrong: '#CCD5C6',
  park: '#CFE3C8',
  userDot: '#2563EB',
  catPurple: '#6D4FC2',
  white: '#FFFFFF',
} as const;

export const fonts = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
} as const;

// Escala tipográfica. "Modo fácil" multiplica por EASY_MODE_SCALE (18 → 22).
export const fontSize = {
  caption: 14,
  small: 16,
  base: 18,
  large: 22,
  title: 28,
  hero: 30,
} as const;

export const EASY_MODE_SCALE = 22 / 18;

export const radius = {
  sm: 14,
  md: 16,
  lg: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

// Accesibilidad: área táctil mínima 56 dp (prompt.md §7).
export const MIN_TOUCH = 56;

export const theme = { colors, fonts, fontSize, radius, spacing, MIN_TOUCH };
export type Theme = typeof theme;
