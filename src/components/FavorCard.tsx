import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { distanceText } from '@/components/ListingCard';
import { Avatar, Badge, Card } from '@/components/ui';
import type { FavorWithMeta } from '@/data/repositories/favors';
import type { Favor, FavorType } from '@/data/types';
import { FAVOR_TYPES, timeAgo } from '@/features/catalog';
import { colors, spacing } from '@/theme/tokens';

const DAY_LABEL: Record<string, string> = { lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue', vie: 'Vie', sab: 'Sáb', dom: 'Dom' };

export function daysText(json: string | null): string | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as string[];
    if (['lun', 'mar', 'mie', 'jue', 'vie'].every((x) => d.includes(x)) && d.length === 5) return 'Lun a vie';
    return d.map((x) => DAY_LABEL[x] ?? x).join(', ');
  } catch {
    return null;
  }
}

/** Texto del botón según el tipo (siempre verbo simple, lenguaje peruano). */
export function helpLabel(type: FavorType): string {
  switch (type) {
    case 'pido':
      return 'Yo te ayudo';
    case 'movilidad':
      return 'Me sumo';
    case 'intercambio':
      return 'Hagamos el cambio';
    default:
      return 'Me interesa';
  }
}

export function offersLabel(type: FavorType, n: number): string {
  if (type === 'pido') return `${n} ${n === 1 ? 'vecino ofrece' : 'vecinos ofrecen'} ayuda`;
  return `${n} ${n === 1 ? 'vecino interesado' : 'vecinos interesados'}`;
}

export function FavorCard({ item, isMine, match }: { item: FavorWithMeta; isMine: boolean; match?: Favor | null }) {
  const t = FAVOR_TYPES[item.type];
  const mobility = item.type === 'movilidad';
  const open = () => router.push(`/favor/${item.id}`);
  return (
    <Card onPress={open} label={`${item.title}. ${t.label}. ${distanceText(item.distance_m)}`} borderColor={mobility ? '#1E4E8C' : undefined}>
      <View style={styles.head}>
        <Avatar name={item.author_name} />
        <View style={{ flex: 1 }}>
          <AppText bold>{isMine ? 'Tú' : item.author_name ?? 'Vecino'}</AppText>
          <AppText variant="small" color={colors.textSecondary}>
            {distanceText(item.distance_m).split(' · ')[0]} · {timeAgo(item.created_at)}
          </AppText>
        </View>
        <Badge label={t.label} color={t.color} bg={t.bg} />
      </View>
      <AppText bold variant="large">
        {item.title}
      </AppText>
      {item.description ? (
        <AppText color={colors.inkSoft} numberOfLines={3}>
          {item.description}
        </AppText>
      ) : null}
      {mobility ? (
        <View style={styles.wrap}>
          {daysText(item.mobility_days) ? <Badge label={daysText(item.mobility_days)!} color={colors.ink} bg={colors.surfaceMuted} /> : null}
          {item.mobility_time ? <Badge label={`${item.mobility_role === 'busco' ? 'Busca quién lleve' : item.mobility_role === 'recojo' ? 'Recoge' : 'Lleva'} · ${item.mobility_time}`} color={colors.ink} bg={colors.surfaceMuted} /> : null}
        </View>
      ) : null}
      {match ? (
        <View style={styles.match}>
          <Ionicons name="checkmark" size={22} color="#1E4E8C" />
          <AppText bold color="#1E4E8C" style={{ flex: 1 }}>
            Coincide: tú también vas a {match.mobility_destination} a las {match.mobility_time}
          </AppText>
        </View>
      ) : null}
      {item.status === 'en_curso' ? <Badge label="En curso · ya tiene quien ayude" color={colors.ok} bg={colors.primarySoft} icon="time-outline" /> : null}
      {item.offers > 0 ? (
        <View style={styles.offers}>
          <Ionicons name="heart" size={18} color={colors.primary} />
          <AppText variant="small" bold color={colors.primary}>
            {offersLabel(item.type, item.offers)}
          </AppText>
        </View>
      ) : null}
      {isMine ? (
        <BigButton label={item.offers > 0 ? 'Ver quién te ayuda' : 'Ver mi publicación'} icon="people-outline" tone="outline" onPress={open} />
      ) : item.my_response_status && item.my_response_status !== 'retirado' ? (
        <Badge label="Ya ofreciste tu ayuda" color={colors.primary} bg={colors.primarySoft} icon="checkmark" />
      ) : item.status === 'abierto' ? (
        <BigButton label={helpLabel(item.type)} icon="heart-outline" onPress={() => router.push(`/favor/ofrecer/${item.id}`)} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  match: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: '#E1EBF7', borderRadius: 14, padding: spacing.md },
  offers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
