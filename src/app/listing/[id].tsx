import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { QuadraMap } from '@/components/QuadraMap';
import { BigButton } from '@/components/BigButton';
import { Avatar, BackHeader, Badge, EmptyState, Field, IconTile, Stat } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { checkVistoBueno, giveVistoBueno, useListing } from '@/data/repositories/listings';
import { findItem, firstName, LISTING_CATEGORIES } from '@/features/catalog';
import { useCurrentUserId } from '@/features/session/store';
import { openWhatsApp } from '@/lib/contact';
import { blocks, distanceMeters, formatMeters, walkingMinutes } from '@/lib/geo';
import { useLocationStore } from '@/lib/location';
import { speak } from '@/lib/tts';
import { colors, radius, spacing } from '@/theme/tokens';

// Detalle + Visto Bueno Vecinal. Diseño: design/pantallas/Detalle.dc.html
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useListing(id);
  const coords = useLocationStore((s) => s.coords);
  const me = useCurrentUserId();
  const [voting, setVoting] = useState(false);

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.xl }}>
          <BackHeader title="Servicios de Proximidad" />
          {!loading ? <EmptyState icon="alert-circle-outline" text="No encontramos esta publicación." /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const { listing, owner, voters, myVote } = data;
  const cat = findItem(LISTING_CATEGORIES, listing.category);
  const d = distanceMeters(coords, listing);
  const isMine = listing.owner_id === me;
  const names = voters.slice(0, 3).map((v) => firstName(v.name));
  const others = Math.max(0, listing.visto_bueno_count - names.length);
  const votersText =
    names.length > 0
      ? `${names.join(', ')}${others > 0 ? ` y ${others} ${others === 1 ? 'vecino' : 'vecinos'} más de tu zona` : ''}`
      : `${listing.visto_bueno_count} ${listing.visto_bueno_count === 1 ? 'vecino' : 'vecinos'} de tu zona le dieron visto bueno`;
  const quote = voters.find((v) => v.comment);

  const contact = () =>
    openWhatsApp(
      listing.whatsapp ?? owner?.phone_whatsapp,
      `¡Hola ${firstName(owner?.display_name)}! Te escribo desde Quadra por "${listing.title}". ¿Está disponible?`,
    );

  const startVote = async () => {
    const check = await checkVistoBueno(listing);
    if (!check.ok) {
      Alert.alert('Visto Bueno Vecinal', check.reason);
      return;
    }
    setVoting(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader
          title="Servicios de Proximidad"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Escuchar esta publicación"
              onPress={() => speak(`${listing.title}. ${listing.description ?? ''}. ${listing.price_hint ?? ''}. Queda a ${walkingMinutes(d)} minutos caminando.`, 'listing')}
              style={styles.listen}
            >
              <Ionicons name="volume-medium-outline" size={26} color={colors.primary} />
            </Pressable>
          }
        />

        <View style={styles.titleRow}>
          <IconTile icon={cat.icon} color={cat.color} bg={cat.bg} size={88} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="title" bold accessibilityRole="header">
              {owner?.display_name && listing.title.startsWith(owner.display_name) ? owner.display_name : listing.title}
            </AppText>
            <AppText color={colors.textSecondary}>
              {listing.description ?? cat.label}
            </AppText>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="Distancia" value={d < 1000 ? `${blocks(d)} ${blocks(d) === 1 ? 'cuadra' : 'cuadras'}` : formatMeters(d)} />
          <Stat label="A pie" value={`${walkingMinutes(d)} min`} />
          <Stat label="Precio" value={listing.price_hint ?? 'A convenir'} />
        </View>

        <View style={{ gap: spacing.sm }}>
          {listing.schedule ? <Badge label={listing.schedule} color={colors.ink} bg={colors.surfaceMuted} icon="time-outline" /> : null}
          {listing.available_in_emergency ? (
            <Badge label={`Disponible en emergencias${listing.emergency_capability ? ' · ' + listing.emergency_capability : ''}`} color={colors.danger} bg={colors.dangerSoft} />
          ) : null}
        </View>

        {/* Visto Bueno Vecinal */}
        <View style={styles.vbCard}>
          <View style={styles.vbHeader}>
            <View style={styles.vbCheck}>
              <Ionicons name="checkmark" size={26} color={colors.white} />
            </View>
            <AppText bold variant="large" style={{ flex: 1 }}>
              Visto Bueno Vecinal
            </AppText>
            <AppText bold variant="hero" color={colors.primary}>
              {listing.visto_bueno_count}
            </AppText>
          </View>
          {listing.visto_bueno_count > 0 ? (
            <View style={styles.vbVoters}>
              <View style={{ flexDirection: 'row' }}>
                {(names.length ? voters.slice(0, 3).map((v) => v.name) : ['Vecino', 'Vecina']).map((n, i) => (
                  <View key={i} style={{ marginLeft: i ? -10 : 0 }}>
                    <Avatar name={n} size={44} />
                  </View>
                ))}
              </View>
              <AppText color={colors.inkSoft} style={{ flex: 1 }}>
                {votersText}
              </AppText>
            </View>
          ) : (
            <AppText color={colors.textSecondary}>Aún nadie le dio visto bueno. ¿Ya usaste este servicio?</AppText>
          )}
          {quote ? (
            <View style={styles.quote}>
              <AppText>
                “{quote.comment}” <AppText color={colors.textSecondary}>· {firstName(quote.name)}, a {formatMeters(quote.distance_m)}</AppText>
              </AppText>
            </View>
          ) : null}
          <AppText variant="small" color={colors.textSecondary}>
            Solo pueden dar visto bueno vecinos a menos de 1.5 km que ya usaron el servicio.
          </AppText>
        </View>

        <QuadraMap center={listing} user={coords} pins={[{ id: listing.id, lat: listing.lat, lng: listing.lng, color: cat.color, icon: cat.icon }]} zoom={15.5} style={{ height: 180 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!isMine ? <BigButton label="Escribirle por WhatsApp" icon="logo-whatsapp" onPress={contact} /> : null}
        {myVote ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={24} color={colors.ok} />
            <AppText bold color={colors.ok}>
              Ya le diste tu Visto Bueno
            </AppText>
          </View>
        ) : !isMine ? (
          <BigButton label="Ya lo usé · Dar Visto Bueno" icon="checkmark" tone="outline" onPress={startVote} />
        ) : (
          <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
            Esta es tu publicación.
          </AppText>
        )}
      </View>

      <VoteModal
        visible={voting}
        onClose={() => setVoting(false)}
        onSubmit={async (comment) => {
          const res = await giveVistoBueno(listing, comment);
          setVoting(false);
          if (res.ok) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            Alert.alert('¡Gracias!', `Tu Visto Bueno ayuda a ${firstName(owner?.display_name)} y a tus vecinos a elegir con confianza.`);
          } else Alert.alert('Visto Bueno Vecinal', res.reason);
        }}
      />
    </SafeAreaView>
  );
}

function VoteModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (comment: string | null) => void }) {
  const [used, setUsed] = useState(false);
  const [comment, setComment] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
        <View style={styles.sheet}>
          <AppText variant="title" bold>
            Dar Visto Bueno
          </AppText>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: used }}
            accessibilityLabel="Ya usé este servicio"
            onPress={() => setUsed(!used)}
            style={[styles.check, used && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name={used ? 'checkbox' : 'square-outline'} size={30} color={colors.primary} />
            <AppText bold>Ya usé este servicio</AppText>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Comentario (opcional)" value={comment} onChangeText={setComment} placeholder="Ej. Llegó puntual y cobró justo" multiline />
            </View>
            <View style={{ justifyContent: 'flex-end' }}>
              <MicButton onText={setComment} label="Dictar comentario" />
            </View>
          </View>
          <BigButton label="Dar mi Visto Bueno" icon="checkmark" disabled={!used} onPress={() => onSubmit(comment || null)} />
          <BigButton label="Cancelar" tone="outline" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  listen: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md },
  vbCard: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.lg + 4, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface },
  vbHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vbCheck: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  vbVoters: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  quote: { backgroundColor: '#F4F1EA', borderRadius: radius.md, padding: spacing.lg },
  footer: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 56 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,27,25,0.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg + 8, borderTopRightRadius: radius.lg + 8, padding: spacing.xl, gap: spacing.lg },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
});
