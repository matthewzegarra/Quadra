import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { initials } from '@/features/catalog';
import { useSession } from '@/features/session/store';
import { colors, EASY_MODE_SCALE, elevation, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

type Icon = keyof typeof Ionicons.glyphMap;

const AVATAR_COLORS = [colors.accent, '#CFE3C8', '#E3D9F5', '#E1EBF7', '#F3E6D6', colors.primarySoft];

export function Avatar({ name, size = 48, color }: { name: string | null | undefined; size?: number; color?: string }) {
  const n = name ?? '?';
  const bg = color ?? AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText bold variant={size > 44 ? 'base' : 'small'}>
        {initials(n)}
      </AppText>
    </View>
  );
}

export function IconTile({ icon, color, bg, size = 56 }: { icon: Icon; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = 'primary',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: Icon;
  tone?: 'primary' | 'danger';
}) {
  const active = tone === 'danger' ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: active, borderColor: active } : { backgroundColor: colors.surface, borderColor: colors.borderStrong },
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={selected ? colors.white : colors.ink} /> : null}
      <AppText bold color={selected ? colors.white : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Badge({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: Icon }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
      <AppText variant="small" bold color={color}>
        {label}
      </AppText>
    </View>
  );
}

export function Card({ children, style, onPress, label, borderColor }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string; borderColor?: string }) {
  const base = [styles.card, borderColor ? { borderColor, borderWidth: 2 } : null, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function BackHeader({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.backRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={28} color={colors.ink} />
      </Pressable>
      {title ? (
        <AppText bold variant="large" color={colors.inkSoft} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onPress} style={styles.backBtn}>
      <Ionicons name="close" size={28} color={colors.ink} />
    </Pressable>
  );
}

/**
 * Campo de texto con etiqueta visible. Opcional: ícono a la izquierda, ayuda debajo y, si es una
 * contraseña, botón "Mostrar / Ocultar" (nada de gestos ocultos).
 */
export function Field({
  label,
  style,
  icon,
  hint,
  invalid,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; icon?: Icon; hint?: string; invalid?: boolean }) {
  const easy = useSession((s) => s.easyMode);
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const borderColor = invalid ? colors.danger : focused ? colors.primary : colors.borderStrong;
  return (
    <View style={{ gap: spacing.xs, flex: (style as ViewStyle)?.flex }}>
      <AppText bold variant="small" color={colors.inkSoft}>
        {label}
      </AppText>
      <View style={[styles.inputWrap, { borderColor }, focused && styles.inputFocused, props.multiline && { alignItems: 'flex-start' }]}>
        {icon ? <Ionicons name={icon} size={22} color={focused ? colors.primary : colors.textSecondary} style={props.multiline ? { marginTop: 16 } : undefined} /> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !reveal}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { fontSize: fontSize.base * (easy ? EASY_MODE_SCALE : 1) },
            props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setReveal(!reveal)}
            style={styles.reveal}
          >
            <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" color={invalid ? colors.danger : colors.textSecondary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Aviso en línea (error, éxito o info) con ícono: nunca solo texto rojo suelto. */
export function Notice({ tone = 'info', title, text, icon }: { tone?: 'info' | 'error' | 'ok'; title?: string; text: string; icon?: Icon }) {
  const t = {
    info: { bg: colors.surfaceMuted, fg: colors.inkSoft, icon: 'information-circle-outline' as Icon },
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as Icon },
    ok: { bg: colors.primarySoft, fg: colors.ok, icon: 'checkmark-circle-outline' as Icon },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole={tone === 'error' ? 'alert' : 'summary'} accessibilityLiveRegion="polite">
      <Ionicons name={icon ?? t.icon} size={24} color={t.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <AppText bold color={t.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="small" color={tone === 'info' ? colors.inkSoft : colors.ink}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** Selector de 2 o 3 opciones a lo ancho (p. ej. "Crear cuenta / Ya tengo cuenta"). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <AppText bold color={on ? colors.white : colors.inkSoft} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="small" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText bold variant="large" color={valueColor}>
        {value}
      </AppText>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <AppText bold variant="large" color={colors.inkSoft} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function EmptyState({ icon, text, title, children }: { icon: Icon; text: string; title?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      {title ? (
        <AppText bold variant="large" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      ) : null}
      <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {text}
      </AppText>
      {children ? <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...elevation(1),
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  inputFocused: { backgroundColor: '#FCFEF8' },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    fontFamily: fonts.regular,
    color: colors.ink,
    paddingVertical: 0,
  },
  reveal: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  notice: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.lg },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, minHeight: MIN_TOUCH - 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  segmentOn: { backgroundColor: colors.primary, ...elevation(2) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
