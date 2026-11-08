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
