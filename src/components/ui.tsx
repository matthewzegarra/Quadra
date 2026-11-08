import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { initials } from '@/features/catalog';
import { useSession } from '@/features/session/store';
import { colors, EASY_MODE_SCALE, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.9 }]}>
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

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const easy = useSession((s) => s.easyMode);
  return (
    <View style={{ gap: spacing.xs, flex: (style as ViewStyle)?.flex }}>
      <AppText bold variant="small" color={colors.inkSoft}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { fontSize: fontSize.base * (easy ? EASY_MODE_SCALE : 1) }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]}
        {...props}
      />
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

export function EmptyState({ icon, text }: { icon: Icon; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.textSecondary} />
      <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {text}
      </AppText>
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
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
});
