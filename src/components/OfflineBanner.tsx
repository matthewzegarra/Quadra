import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useSyncState } from '@/data/store';
import { useConnectivity } from '@/lib/connectivity';
import { colors, radius, spacing } from '@/theme/tokens';

function ago(ts: number | null): string {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'hace un momento';
  return `hace ${m} min`;
}

/** "Sin conexión · 3 publicaciones esperando enviarse" / "Sincronizado hace 1 min". */
export function OfflineBanner({ compact }: { compact?: boolean }) {
  const isOnline = useConnectivity((s) => s.isOnline);
  const { pending, lastSyncAt, syncing } = useSyncState();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (isOnline && pending === 0 && compact) return null;

  let icon: keyof typeof Ionicons.glyphMap = 'cloud-done-outline';
  let text: React.ReactNode;
  if (!isOnline) {
    icon = 'cloud-offline-outline';
    text = (
      <>
        Sin conexión
        {pending > 0 ? (
          <>
            {' · '}
            <AppText bold>
              {pending} {pending === 1 ? 'publicación' : 'publicaciones'}
            </AppText>{' '}
            esperando enviarse
          </>
        ) : (
          ' · todo se guarda en tu celular'
        )}
      </>
    );
  } else if (syncing || pending > 0) {
    icon = 'sync-outline';
    text = `Enviando ${pending} ${pending === 1 ? 'publicación' : 'publicaciones'}…`;
  } else {
    text = lastSyncAt ? `Sincronizado ${ago(lastSyncAt)}` : 'Conectado';
  }

  return (
    <View style={styles.banner} accessibilityRole="summary" accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={22} color={colors.inkSoft} />
      <AppText variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
