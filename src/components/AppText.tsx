import { Text, type TextProps, type TextStyle } from 'react-native';
import { useSession } from '@/features/session/store';
import { colors, EASY_MODE_SCALE, fonts, fontSize } from '@/theme/tokens';

type Variant = keyof typeof fontSize;

type Props = TextProps & {
  variant?: Variant;
  bold?: boolean;
  color?: string;
};

/**
 * Tope a la letra grande del sistema: nuestra base ya es 18 sp (y "Modo fácil" la sube),
 * sin tope un celular con fuente al máximo parte las palabras letra por letra.
 */
const MAX_SYSTEM_FONT_SCALE = 1.2;

/** Texto base de la app: Atkinson Hyperlegible, 18 sp por defecto, escala con "Modo fácil". */
export function AppText({ variant = 'base', bold, color = colors.ink, style, maxFontSizeMultiplier = MAX_SYSTEM_FONT_SCALE, ...rest }: Props) {
  const easyMode = useSession((s) => s.easyMode);
  const size = fontSize[variant] * (easyMode ? EASY_MODE_SCALE : 1);
  const base: TextStyle = {
    fontFamily: bold ? fonts.bold : fonts.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.3),
    color,
  };
  return <Text style={[base, style]} maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} />;
}
