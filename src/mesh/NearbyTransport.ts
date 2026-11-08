import {
  acceptConnection,
  disconnect,
  isPlayServicesAvailable,
  onConnected,
  onDisconnected,
  onInvitationReceived,
  onPeerFound,
  onPeerLost,
  onTextReceived,
  requestConnection,
  sendText,
  startAdvertise,
  startDiscovery,
  stopAdvertise,
  stopDiscovery,
  Strategy,
} from 'expo-nearby-connections';
import { PermissionsAndroid, Platform } from 'react-native';
import type { MeshMessage, MeshTransport, Peer } from '@/mesh/MeshTransport';

// Transporte mesh con Google Nearby Connections (Bluetooth + Wi-Fi Direct, sin internet ni hardware extra).
// Cada celular anuncia y descubre a la vez (P2P_CLUSTER: varios a varios) y se conecta solo,
// sin pedir confirmación al usuario (modo emergencia).

type Unsub = () => void;

/** Nombre de endpoint: "<id corto>|<nombre>". El id corto decide quién inicia la conexión. */
const encodeName = (selfId: string, name: string) => `${selfId.slice(0, 8)}|${name.slice(0, 24)}`;
const decodeName = (endpoint: string) => {
  const [id, ...rest] = endpoint.split('|');
  return { short: id ?? '', name: rest.join('|') || endpoint };
};

export async function requestMeshPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const perms: string[] = [P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION];
  if (api >= 31) perms.push(P.BLUETOOTH_SCAN, P.BLUETOOTH_ADVERTISE, P.BLUETOOTH_CONNECT);
  if (api >= 33) perms.push(P.NEARBY_WIFI_DEVICES);
  const res = await PermissionsAndroid.requestMultiple(perms.filter(Boolean) as never);
  return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export class NearbyTransport implements MeshTransport {
  private selfShort = '';
  private peers = new Map<string, Peer>();
  private pending = new Set<string>();
  private subs: Unsub[] = [];
  private msgCbs = new Set<(msg: MeshMessage, from: string) => void>();
  private peerCbs = new Set<(peers: Peer[]) => void>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private running = false;

  async start(selfId: string, name: string): Promise<void> {
    if (this.running) return;
    if (!(await isPlayServicesAvailable())) throw new Error('Este celular no tiene Google Play Services');
    if (!(await requestMeshPermissions())) throw new Error('Faltan permisos de Bluetooth y dispositivos cercanos');
    this.running = true;
    this.selfShort = selfId.slice(0, 8);
    const endpoint = encodeName(selfId, name);

    this.subs.push(
      onPeerFound(({ peerId, name: ep }) => {
        const { short, name: peerName } = decodeName(ep);
        if (!this.peers.has(peerId)) this.peers.set(peerId, { id: peerId, name: peerName, connected: false });
        this.emitPeers();
        // Solo uno de los dos inicia (evita conexiones cruzadas); el otro reintenta si nadie lo hizo.
        const delay = this.selfShort < short ? 0 : 5000;
        this.scheduleConnect(peerId, delay);
      }),
      onPeerLost(({ peerId }) => {
        const p = this.peers.get(peerId);
        if (p && !p.connected) this.peers.delete(peerId);
        this.emitPeers();
      }),
      onInvitationReceived(({ peerId, name: ep }) => {
        const { name: peerName } = decodeName(ep);
        this.peers.set(peerId, { id: peerId, name: peerName, connected: false });
        acceptConnection(peerId).catch((e) => console.warn('[mesh] accept', e));
      }),
      onConnected(({ peerId, name: ep }) => {
        const prev = this.peers.get(peerId);
        const peerName = ep ? decodeName(ep).name : prev?.name ?? 'Vecino';
        this.peers.set(peerId, { id: peerId, name: peerName, connected: true });
        this.pending.delete(peerId);
        this.clearRetry(peerId);
        this.emitPeers();
      }),
      onDisconnected(({ peerId }) => {
        this.peers.delete(peerId);
        this.pending.delete(peerId);
        this.emitPeers();
      }),
      onTextReceived(({ peerId, text }) => {
        try {
          const msg = JSON.parse(text) as MeshMessage;
          if (msg?.v !== 1 || !msg.id) return;
          this.msgCbs.forEach((cb) => cb(msg, peerId));
        } catch {
          // payload ajeno o corrupto: se ignora
        }
      }),
    );

    await startAdvertise(endpoint, Strategy.P2P_CLUSTER);
    await startDiscovery(endpoint, Strategy.P2P_CLUSTER);
  }

  private scheduleConnect(peerId: string, delay: number) {
    this.clearRetry(peerId);
    this.retryTimers.set(
      peerId,
      setTimeout(() => {
        const p = this.peers.get(peerId);
        if (!this.running || !p || p.connected || this.pending.has(peerId)) return;
        this.pending.add(peerId);
        requestConnection(peerId).catch((e) => {
          this.pending.delete(peerId);
          console.warn('[mesh] request', e?.message ?? e);
          this.scheduleConnect(peerId, 4000); // reconexión
        });
      }, delay),
    );
  }

  private clearRetry(peerId: string) {
    const t = this.retryTimers.get(peerId);
    if (t) clearTimeout(t);
    this.retryTimers.delete(peerId);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.subs.forEach((u) => u());
    this.subs = [];
    this.retryTimers.forEach((t) => clearTimeout(t));
    this.retryTimers.clear();
    await Promise.allSettled([stopAdvertise(), stopDiscovery(), disconnect()]);
    this.peers.clear();
    this.pending.clear();
    this.emitPeers();
  }

  async broadcast(msg: MeshMessage, exceptPeer?: string): Promise<void> {
    const text = JSON.stringify(msg);
    const targets = [...this.peers.values()].filter((p) => p.connected && p.id !== exceptPeer);
    await Promise.allSettled(targets.map((p) => sendText(p.id, text)));
  }

  async sendTo(peerId: string, msg: MeshMessage): Promise<void> {
    await sendText(peerId, JSON.stringify(msg));
  }

  onMessage(cb: (msg: MeshMessage, fromPeer: string) => void): () => void {
    this.msgCbs.add(cb);
    return () => this.msgCbs.delete(cb);
  }

  onPeersChanged(cb: (peers: Peer[]) => void): () => void {
    this.peerCbs.add(cb);
    return () => this.peerCbs.delete(cb);
  }

  private emitPeers() {
    const list = [...this.peers.values()];
    this.peerCbs.forEach((cb) => cb(list));
  }
}
