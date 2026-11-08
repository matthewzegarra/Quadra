import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BackHeader, Card, Stat } from '@/components/ui';
import { useSession } from '@/features/session/store';
import { useConnectivity } from '@/lib/connectivity';
import { startMesh, stopMesh, useMesh } from '@/mesh/MeshRouter';
import { colors, spacing } from '@/theme/tokens';

// Diagnóstico de la red vecinal (modo demo): peers, mensajes vistos y reenviados.
export default function RedVecinalScreen() {
  const mesh = useMesh();
  const isOnline = useConnectivity((s) => s.isOnline);
  const { meshEnabled, setMeshEnabled } = useSession();
  const connected = mesh.peers.filter((p) => p.connected);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Red vecinal" />
        <AppText color={colors.inkSoft}>
          Cada celular es un “cartero”: guarda los avisos de emergencia y los pasa a los vecinos cercanos por Bluetooth y Wi-Fi Direct, sin internet. Cuando alguien recupera la señal, sube todo a la nube.
        </AppText>
        <View style={styles.stats}>
          <Stat label="Conectados" value={String(connected.length)} />
          <Stat label="Recibidos" value={String(mesh.received)} />
          <Stat label="Reenviados" value={String(mesh.forwarded)} />
        </View>
        <View style={styles.stats}>
          <Stat label="Enviados" value={String(mesh.sent)} />
          <Stat label="Vistos" value={String(mesh.seen)} />
          <Stat label="Internet" value={isOnline ? 'Sí' : 'No'} />
        </View>
        <Card>
          <AppText bold>Estado: {mesh.running ? 'activa' : 'apagada'}</AppText>
          {mesh.error ? <AppText color={colors.danger}>{mesh.error}</AppText> : null}
          {mesh.peers.length === 0 ? <AppText color={colors.textSecondary}>Aún no hay celulares cerca con Quadra abierto.</AppText> : null}
          {mesh.peers.map((p) => (
            <View key={p.id} style={styles.peer}>
              <Ionicons name={p.connected ? 'bluetooth' : 'search-outline'} size={22} color={p.connected ? colors.primary : colors.textSecondary} />
              <AppText style={{ flex: 1 }}>{p.name}</AppText>
              <AppText variant="small" color={p.connected ? colors.ok : colors.textSecondary}>
                {p.connected ? 'conectado' : 'encontrado'}
              </AppText>
            </View>
          ))}
        </Card>
        {mesh.running ? (
          <BigButton
            label="Apagar red vecinal"
            icon="close-circle-outline"
            tone="outline"
            onPress={() => {
              setMeshEnabled(false);
              void stopMesh();
            }}
          />
        ) : (
          <BigButton
            label="Encender red vecinal"
            icon="bluetooth"
            onPress={() => {
              setMeshEnabled(true);
              void startMesh();
            }}
          />
        )}
        {!meshEnabled ? (
          <AppText variant="small" color={colors.textSecondary}>
            Se enciende sola en Modo Emergencia o cuando no hay internet.
          </AppText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.md },
  peer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
});
