// Contrato del transporte de mensajes de emergencia entre celulares.
// Hoy: NearbyTransport (Bluetooth + Wi-Fi Direct vía Google Nearby Connections).
// Mañana: LoRaTransport (nodos vecinales) sin tocar MeshRouter ni la UI.

export type MeshMessageType = 'SOS' | 'OK' | 'VUL' | 'NEED' | 'OFFER' | 'EMERGENCY_ON' | 'EMERGENCY_OFF';

/** Formato compacto (JSON corto) para que quepa en un payload de bytes. */
export type MeshMessage = {
  v: 1;
  id: string; // mismo id que emergency_reports.id → idempotencia al subir
  ttl: number;
  h: number; // saltos recorridos
  t: MeshMessageType;
  a: string; // author id
  n: string; // nombre del autor
  la: number;
  lo: number;
  nd?: string; // need
  m?: string; // mensaje
  pc?: number; // personas
  p?: string[]; // ruta: nombres cortos de quienes lo reenviaron (para mostrar A → B → Tú)
  ts: number; // epoch ms
};

export type Peer = {
  id: string;
  name: string;
  connected: boolean;
};

export interface MeshTransport {
  start(selfId: string, name: string): Promise<void>;
  stop(): Promise<void>;
  /** Envía a todos los peers conectados. `exceptPeer` evita devolverle el mensaje al emisor. */
  broadcast(msg: MeshMessage, exceptPeer?: string): Promise<void>;
  /** Envía a un solo peer (para "guardar y reenviar" cuando aparece alguien nuevo). */
  sendTo(peerId: string, msg: MeshMessage): Promise<void>;
  onMessage(cb: (msg: MeshMessage, fromPeer: string) => void): () => void;
  onPeersChanged(cb: (peers: Peer[]) => void): () => void;
}

export const MESH_INITIAL_TTL = 6;
export const MESH_RETENTION_MS = 6 * 60 * 60 * 1000;

const MESH_TYPES = new Set<MeshMessageType>(['SOS', 'OK', 'VUL', 'NEED', 'OFFER', 'EMERGENCY_ON', 'EMERGENCY_OFF']);

/** Descarta mensajes ajenos, enormes o con coordenadas imposibles. */
export function isValidMeshMessage(msg: unknown): msg is MeshMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Partial<MeshMessage>;
  if (m.v !== 1 || typeof m.id !== 'string' || m.id.length < 8 || m.id.length > 80) return false;
  if (typeof m.ttl !== 'number' || m.ttl < 0 || m.ttl > MESH_INITIAL_TTL) return false;
  if (typeof m.h !== 'number' || m.h < 0 || m.h > 12) return false;
  if (typeof m.t !== 'string' || !MESH_TYPES.has(m.t)) return false;
  if (typeof m.la !== 'number' || typeof m.lo !== 'number') return false;
  if (m.la < -90 || m.la > 90 || m.lo < -180 || m.lo > 180) return false;
  if (typeof m.ts !== 'number' || m.ts > Date.now() + 5 * 60_000 || Date.now() - m.ts > 24 * 60 * 60 * 1000) return false;
  if (m.n != null && (typeof m.n !== 'string' || m.n.length > 80)) return false;
  if (m.m != null && (typeof m.m !== 'string' || m.m.length > 160)) return false;
  if (m.nd != null && (typeof m.nd !== 'string' || m.nd.length > 40)) return false;
  if (m.a != null && (typeof m.a !== 'string' || m.a.length > 80)) return false;
  if (m.p != null && (!Array.isArray(m.p) || m.p.length > 8 || m.p.some((x) => typeof x !== 'string' || x.length > 40))) return false;
  if (m.pc != null && (typeof m.pc !== 'number' || m.pc < 0 || m.pc > 50)) return false;
  return true;
}
