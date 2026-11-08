import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { QuadraMap, type MapPin } from '@/components/QuadraMap';
import { BigButton } from '@/components/BigButton';
import { daysText, helpLabel, offersLabel } from '@/components/FavorCard';
import { distanceText } from '@/components/ListingCard';
import { Avatar, BackHeader, Badge, Card, EmptyState } from '@/components/ui';
import { acceptOffer, resolveFavor, useFavor, useMobilityMatches, withdrawOffer, type OfferWithMeta } from '@/data/repositories/favors';
import type { Favor } from '@/data/types';
import { FAVOR_TYPES, firstName, timeAgo } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { openWhatsApp } from '@/lib/contact';
import { distanceMeters, formatMeters, roundLocation, walkingMinutes } from '@/lib/geo';
import { useLocationStore } from '@/lib/location';
import { colors, radius, spacing } from '@/theme/tokens';

// Detalle del favor. Si es mío: "Elegir quién te ayuda" (design/pantallas/OfertasFavor.dc.html).
export default function FavorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useFavor(id);
  const me = useCurrentUserId();
  const coords = useLocationStore((s) => s.coords);
  const { data: matches = [] } = useMobilityMatches(data?.favor);

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.xl }}>
          <BackHeader />
          {!loading ? <EmptyState icon="alert-circle-outline" text="No encontramos este favor." /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const { favor, author, offers, mine } = data;
  const isMine = favor.author_id === me;
  const t = FAVOR_TYPES[favor.type];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title={isMine ? 'Tu pedido' : 'Cadena de Favores'} />
        <AppText variant="hero" bold accessibilityRole="header">
          {favor.title}
        </AppText>
        <View style={styles.wrap}>
          <Badge label={t.label} color={t.color} bg={t.bg} icon={t.icon} />
          <Badge
            label={favor.status === 'abierto' ? 'Abierto' : favor.status === 'en_curso' ? 'En curso' : 'Resuelto'}
            color={favor.status === 'resuelto' ? colors.ok : colors.inkSoft}
            bg={colors.surfaceMuted}
          />
          {offers.length > 0 ? <Badge label={offersLabel(favor.type, offers.length)} color={colors.primaryDark} bg={colors.primarySoft} icon="heart-outline" /> : null}
        </View>

        {!isMine ? (
          <View style={styles.author}>
            <Avatar name={author?.display_name} size={56} />
            <View style={{ flex: 1 }}>
              <AppText bold variant="large">
                {author?.display_name ?? 'Vecino'}
              </AppText>
              <AppText color={colors.textSecondary}>
                {distanceText(distanceMeters(coords, favor))} · {timeAgo(favor.created_at)}
              </AppText>
            </View>
          </View>
        ) : null}

        {favor.description ? <AppText color={colors.inkSoft}>{favor.description}</AppText> : null}

        {favor.type === 'movilidad' ? (
          <Card>
            <AppText bold>
              {favor.mobility_role === 'busco' ? 'Busca quién lleve' : favor.mobility_role === 'recojo' ? 'Recoge' : 'Lleva'} · {favor.mobility_destination}
            </AppText>
            <AppText color={colors.textSecondary}>
              {daysText(favor.mobility_days) ?? ''} · {favor.mobility_time}
            </AppText>
            {matches.length > 0 ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {matches.map((m) => (
                  <Pressable key={m.id} onPress={() => router.push(`/favor/${m.id}`)} style={styles.match} accessibilityRole="button">
                    <Ionicons name="people" size={22} color="#1E4E8C" />
                    <AppText bold color="#1E4E8C" style={{ flex: 1 }}>
                      {firstName(m.author_name)} también va a {m.mobility_destination} a las {m.mobility_time}
                    </AppText>
                    <Ionicons name="chevron-forward" size={20} color="#1E4E8C" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <AppText variant="small" color={colors.textSecondary}>
                Aún no hay coincidencias. Te avisamos cuando alguien vaya al mismo lugar.
              </AppText>
            )}
          </Card>
        ) : null}

        {isMine ? <MyOffers favor={favor} offers={offers} /> : <HelperView favor={favor} mine={mine} authorName={author?.display_name ?? null} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Vista de quien pidió: ofertas ordenadas por distancia, mini mapa numerado, elegir. */
function MyOffers({ favor, offers }: { favor: Favor; offers: OfferWithMeta[] }) {
  const accepted = offers.find((o) => o.id === favor.accepted_response_id) ?? offers.find((o) => o.status === 'aceptado' || o.status === 'completado');
  // Privacidad: antes de aceptar, ubicación redondeada a ~50 m
  const shown = offers.map((o) => (o.id === accepted?.id ? o : { ...o, ...roundLocation(o) }));
  const pins: MapPin[] = shown.map((o, i) => ({
    id: o.id,
    lat: o.lat,
    lng: o.lng,
    color: o.id === accepted?.id ? colors.ok : colors.primary,
    text: String(i + 1),
    label: `${i + 1}. ${o.responder_name}`,
  }));

  const choose = (o: OfferWithMeta) => {
    Alert.alert(`¿Elegir a ${firstName(o.responder_name)}?`, 'A los demás les enviamos un “¡Gracias, vecino!” automático y suman 1 Quadri Point por ofrecer su ayuda.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Elegir',
        onPress: async () => {
          await acceptOffer(favor, o, offers);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          void openWhatsApp(o.phone, `¡Hola ${firstName(o.responder_name)}! Te elegí en Quadra para "${favor.title}". ¿Coordinamos?`);
        },
      },
    ]);
  };

  const resolve = () =>
    Alert.alert('¿Ya te ayudaron?', `${firstName(accepted?.responder_name)} recibirá 5 Quadri Points por su ayuda.`, [
      { text: 'Todavía no', style: 'cancel' },
      {
        text: 'Sí, ya me ayudaron',
        onPress: async () => {
          await resolveFavor(favor);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          Alert.alert('¡Qué bueno!', `Gracias por usar la Cadena de Favores. ${firstName(accepted?.responder_name)} suma +5 Quadri Points.`);
        },
      },
    ]);

  if (offers.length === 0) {
    return (
      <Card>
        <EmptyState icon="hourglass-outline" text="Todavía nadie respondió. Te avisaremos con una notificación cuando un vecino te ofrezca ayuda." />
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <QuadraMap center={favor} user={favor} pins={pins} zoom={14.5} style={{ height: 200 }} />
      {accepted ? (
        <Card borderColor={colors.ok}>
          <AppText bold variant="large">
            Te ayuda {accepted.responder_name}
          </AppText>
          <AppText color={colors.textSecondary}>
            {formatMeters(accepted.distance_m)} · {walkingMinutes(accepted.distance_m)} min a pie
            {accepted.location_label ? ` · ${accepted.location_label}` : ''}
          </AppText>
          {accepted.message ? <AppText>“{accepted.message}”</AppText> : null}
          <BigButton label="Escribirle por WhatsApp" icon="logo-whatsapp" onPress={() => openWhatsApp(accepted.phone, `¡Hola ${firstName(accepted.responder_name)}! Te escribo por "${favor.title}" en Quadra.`)} />
          {favor.status !== 'resuelto' ? (
            <BigButton label="Ya me ayudaron" icon="checkmark-done" tone="ok" onPress={resolve} />
          ) : (
            <Badge label="Resuelto · +5 Quadri Points para quien ayudó" color={colors.ok} bg={colors.primarySoft} icon="checkmark-done" />
          )}
        </Card>
      ) : null}
      {shown.map((o, i) => (
        <OfferCard key={o.id} n={i + 1} offer={o} closest={i === 0} accepted={o.id === accepted?.id} canChoose={!accepted && favor.status === 'abierto'} onChoose={() => choose(o)} />
      ))}
      {!accepted ? (
        <View style={styles.note}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.inkSoft} />
          <AppText color={colors.inkSoft} style={{ flex: 1 }}>
            Al elegir, a los demás les enviamos un “¡Gracias, vecino!” automático y suman 1 Quadri Point por ofrecer su ayuda.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function OfferCard({ n, offer, closest, accepted, canChoose, onChoose }: { n: number; offer: OfferWithMeta; closest: boolean; accepted: boolean; canChoose: boolean; onChoose: () => void }) {
  const stats = [
    `${formatMeters(offer.distance_m)}`,
    `${walkingMinutes(offer.distance_m)} min a pie`,
    offer.aynis != null ? `${offer.aynis} Quadri Points` : null,
  ].filter(Boolean);
  return (
    <Card borderColor={closest && canChoose ? colors.primary : accepted ? colors.ok : undefined}>
      <View style={styles.offerHead}>
        <View style={styles.num}>
          <AppText bold color={colors.white}>
            {n}
          </AppText>
        </View>
        <AppText bold variant="large" style={{ flex: 1 }}>
          {offer.responder_name ?? 'Vecino'}
        </AppText>
        {closest && canChoose ? <Badge label="Más cerca" color={colors.accentInk} bg={colors.accentSoft} /> : null}
        {offer.status === 'agradecido' ? <Badge label="Agradecido" color={colors.inkSoft} bg={colors.surfaceMuted} /> : null}
      </View>
      <AppText color={colors.inkSoft}>
        <AppText bold>{stats[0]}</AppText> · {stats.slice(1).join(' · ')}
      </AppText>
      <View style={styles.offerFoot}>
        <AppText style={{ flex: 1 }}>{offer.message ? `“${offer.message}”` : ''}</AppText>
        {canChoose ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Elegir a ${offer.responder_name}`} onPress={onChoose} style={[styles.choose, closest && { backgroundColor: colors.primary }]}>
            <AppText bold variant="large" color={closest ? colors.white : colors.primary}>
              Elegir
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

/** Vista de un vecino que no es el autor: su oferta o el botón "Yo te ayudo". */
function HelperView({ favor, mine, authorName }: { favor: Favor; mine: OfferWithMeta | import('@/data/types').FavorResponse | null; authorName: string | null }) {
  if (mine && mine.status !== 'retirado') {
    const status = {
      propuesto: `Ofreciste tu ayuda. ${firstName(authorName)} elegirá pronto.`,
      aceptado: `¡${firstName(authorName)} te eligió! Coordinen por WhatsApp.`,
      agradecido: mine.thanks_message ?? '¡Gracias, vecino! Esta vez ya me ayudaron, pero tu intención cuenta.',
      completado: '¡Ayudaste! Sumaste 5 Quadri Points.',
      retirado: '',
    }[mine.status];
    return (
      <Card borderColor={mine.status === 'aceptado' ? colors.ok : colors.primary}>
        <AppText bold variant="large">
          Tu oferta
        </AppText>
        <AppText>{status}</AppText>
        {mine.message ? <AppText color={colors.textSecondary}>“{mine.message}”</AppText> : null}
        {mine.status === 'agradecido' ? <Badge label="+1 Quadri Point por ofrecer tu ayuda" color={colors.accentInk} bg={colors.accentSoft} /> : null}
        {mine.status === 'propuesto' ? (
          <BigButton
            label="Retirar mi oferta"
            icon="close"
            tone="outline"
            onPress={() =>
              Alert.alert('¿Retirar tu oferta?', '', [
                { text: 'No', style: 'cancel' },
                { text: 'Retirar', style: 'destructive', onPress: () => void withdrawOffer(mine.id) },
              ])
            }
          />
        ) : null}
      </Card>
    );
  }
  if (favor.status !== 'abierto') return <Badge label="Este favor ya tiene quien ayude" color={colors.ok} bg={colors.primarySoft} />;
  return <BigButton label={helpLabel(favor.type)} icon="heart-outline" onPress={() => router.push(`/favor/ofrecer/${favor.id}`)} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  match: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#E1EBF7', borderRadius: radius.md, padding: spacing.md, minHeight: 56 },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  num: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  offerFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  choose: { minHeight: 56, paddingHorizontal: spacing.xl, borderRadius: radius.md, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center' },
  note: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, padding: spacing.lg },
});
