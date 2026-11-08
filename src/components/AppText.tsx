import { Text, type TextProps, type TextStyle } from 'react-native';
import { useSession } from '@/features/session/store';
import { colors, EASY_MODE_SCALE, fonts, fontSize } from '@/theme/tokens';

type Variant = keyof typeof fontSize;

type Props = TextProps & {
  variant?: Variant;
  bold?: boolean;
  color?: string;
};

/** Texto base de la app: Atkinson Hyperlegible, 18 sp por defecto, escala con "Modo fácil". */
export function AppText({ variant = 'base', bold, color = colors.ink, style, ...rest }: Props) {
  const easyMode = useSession((s) => s.easyMode);
  const size = fontSize[variant] * (easyMode ? EASY_MODE_SCALE : 1);
  const base: TextStyle = {
    fontFamily: bold ? fonts.bold : fonts.regular,
    fontSize: size,
    lineHeight: Math.round(size * 1.3),
    color,
  };
  return <Text style={[base, style]} {...rest} />;
}
