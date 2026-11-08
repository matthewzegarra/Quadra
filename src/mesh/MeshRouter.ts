import { create } from 'zustand';
import { getDb } from '@/data/db';
import { enqueueOnly, putLocal } from '@/data/repositories/base';
import { bumpTables } from '@/data/store';
import type { EmergencyReport, ReportKind, Zone } from '@/data/types';
import { firstName } from '@/features/catalog';
import { currentUserId, currentUserName } from '@/features/session/store';
import { MESH_INITIAL_TTL, MESH_RETENTION_MS, type MeshMessage, type MeshMessageType, type MeshTransport, type Peer } from '@/mesh/MeshTransport';
import { publicCoords } from '@/lib/privacy';
import { NearbyTransport } from '@/mesh/NearbyTransport';
import { notify, zoneEmergencyKey } from '@/lib/notify';
import { DEMO_ZONE_ID } from '@/lib/zone';

// Router del mesh vecinal: deduplicación (mesh_seen), TTL, guardar y reenviar.
// Independiente del transporte: mañana se agrega un LoRaTransport sin tocar esta lógica.

const KIND_TO_T: Record<ReportKind, MeshMessageType> = {
  sos: 'SOS',
  estoy_bien: 'OK',
  vulnerable: 'VUL',
  recurso_necesito: 'NEED',
  recurso_ofrezco: 'OFFER',
};
const T_TO_KIND: Partial<Record<MeshMessageType, ReportKind>> = {
  SOS: 'sos',
  OK: 'estoy_bien',
  VUL: 'vulnerable',
  NEED: 'recurso_necesito',
  OFFER: 'recurso_ofrezco',
};
const PRIORITY: Record<ReportKind, number> = { sos: 1, vulnerable: 1, recurso_necesito: 2, recurso_ofrezco: 3, estoy_bien: 3 };

type MeshState = {
  running: boolean;
  peers: Peer[];
  received: number;
  forwarded: number;
  sent: number;
  seen: number;
  error: string | null;
};
export const useMesh = create<MeshState>(() => ({ running: false, peers: [], received: 0, forwarded: 0, sent: 0, seen: 0, error: null }));
const inc = (k: 'received' | 'forwarded' | 'sent' | 'seen', n = 1) => useMesh.setState((s) => ({ [k]: s[k] + n }) as Partial<MeshState>);

let transport: MeshTransport | null = null;
let unsubs: (() => void)[] = [];
/** Mensajes vigentes (últimas 6 h) para "guardar y reenviar" a peers nuevos. */
const retained = new Map<string, MeshMessage>();
let knownConnected = new Set<string>();

async function alreadySeen(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT id FROM mesh_seen WHERE id = ?', [id]);
  if (row) return true;
  await db.runAsync('INSERT OR IGNORE INTO mesh_seen (id, seen_at) VALUES (?, ?)', [id, Date.now()]);
  inc('seen');
  return false;
}

export function reportToMessage(r: EmergencyReport, path: string[] = []): MeshMessage {
  const snapped = publicCoords(r);
  const zone =
    r.public_lat != null && r.public_lng != null
      ? { lat: r.public_lat, lng: r.public_lng }
      : { lat: snapped.public_lat, lng: snapped.public_lng };
  return {
    v: 1,
    id: r.id,
    ttl: MESH_INITIAL_TTL,
    h: 0,
    t: KIND_TO_T[r.kind],
    a: r.author_id ?? '',
    n: r.author_name ?? 'Vecino',
    la: +zone.lat.toFixed(5),
    lo: +zone.lng.toFixed(5),
    nd: r.need ?? undefined,
    m: r.description ? r.description.slice(0, 140) : undefined,
    pc: r.people_count ?? undefined,
    p: path,
    ts: new Date(r.created_at).getTime(),
  };
}

async function handleControl(msg: MeshMessage) {
  const db = await getDb();
  const zone = await db.getFirstAsync<Zone>('SELECT * FROM zones WHERE id = ?', [DEMO_ZONE_ID]);
  if (!zone) return;
  const on = msg.t === 'EMERGENCY_ON';
  await putLocal('zones', {
    ...zone,
    emergency_active: on ? 1 : 0,
    emergency_type: on ? msg.m ?? 'otro' : zone.emergency_type,
    emergency_started_at: on ? new Date(msg.ts).toISOString() : zone.emergency_started_at,
  });
  bumpTables('zones');
  if (on)
    notify('Modo Emergencia activado', 'La junta vecinal activó el Modo Emergencia. Llegó por la red vecinal.', {
      channel: 'emergencia',
      url: '/emergencia',
      dedupeKey: zoneEmergencyKey(msg.ts),
    });
}

async function handleReport(msg: MeshMessage) {
  const kind = T_TO_KIND[msg.t];
  if (!kind) return;
  const at = new Date(msg.ts).toISOString();
  const row = {
    id: msg.id,
    author_id: msg.a || null,
    author_name: msg.n,
    zone_id: DEMO_ZONE_ID,
    kind,
    need: msg.nd ?? null,
    description: msg.m ?? null,
    people_count: msg.pc ?? 1,
    priority: PRIORITY[kind],
    lat: msg.la,
    lng: msg.lo,
    public_lat: msg.la,
    public_lng: msg.lo,
    review_status: 'pendiente',
    status: 'abierto',
    origin: 'mesh',
    mesh_hops: msg.h + 1,
    mesh_path: JSON.stringify(msg.p ?? []),
    created_at: at,
    updated_at: at,
  };
  const inserted = await putLocal('emergency_reports', row, 'ignore');
  if (inserted) {
    // Quien tenga internet lo sube (upsert idempotente por id: no se duplica aunque llegue por varios caminos)
    const { mesh_path: _p, ...serverRow } = row;
    await enqueueOnly('emergency_reports', 'insert', serverRow);
    bumpTables('emergency_reports');
    if (kind === 'sos' || kind === 'vulnerable') {
      notify(
        `SOS recibido · ${firstName(msg.n)} necesita ayuda`,
        `${msg.m ?? msg.nd ?? 'Pide ayuda'} · vía red vecinal, ${msg.h + 1} ${msg.h + 1 === 1 ? 'salto' : 'saltos'}`,
        { channel: 'emergencia', url: `/emergencia/recibido/${msg.id}`, dedupeKey: `report.${msg.id}` },
      );
    }
  }
}

async function onMessage(msg: MeshMessage, fromPeer: string) {
  if (await alreadySeen(msg.id)) return; // dedupe
  inc('received');
  if (msg.t === 'EMERGENCY_ON' || msg.t === 'EMERGENCY_OFF') await handleControl(msg);
  else await handleReport(msg);

  // Reenviar a todos menos al emisor, con TTL - 1 y mi nombre en la ruta
  const fwd: MeshMessage = { ...msg, ttl: msg.ttl - 1, h: msg.h + 1, p: [...(msg.p ?? []), firstName(currentUserName())].slice(-6) };
  if (Date.now() - msg.ts < MESH_RETENTION_MS) retained.set(msg.id, fwd);
  if (fwd.ttl > 0 && transport) {
    await transport.broadcast(fwd, fromPeer);
    inc('forwarded');
  }
}

async function onPeers(peers: Peer[]) {
  useMesh.setState({ peers });
  const connected = new Set(peers.filter((p) => p.connected).map((p) => p.id));
  const fresh = [...connected].filter((id) => !knownConnected.has(id));
  knownConnected = connected;
  // Guardar y reenviar: al aparecer un vecino nuevo, le pasamos todo lo vigente
  for (const peerId of fresh) {
    for (const [id, m] of retained) {
      if (Date.now() - m.ts > MESH_RETENTION_MS) {
        retained.delete(id);
        continue;
      }
      if (m.ttl > 0) await transport?.sendTo(peerId, m).catch(() => {});
    }
  }
}

/** Carga a la memoria los reportes de las últimas 6 h para reenviarlos. */
async function loadRetained() {
  const db = await getDb();
  const since = new Date(Date.now() - MESH_RETENTION_MS).toISOString();
  const rows = await db.getAllAsync<EmergencyReport & { mesh_path: string | null }>(
    `SELECT * FROM emergency_reports WHERE created_at > ? AND status <> 'resuelto' AND id NOT LIKE 'f0000000-%'`,
    [since],
  );
  for (const r of rows) {
    const path = r.mesh_path ? (JSON.parse(r.mesh_path) as string[]) : [];
    const m = reportToMessage(r, path);
    m.h = r.mesh_hops ?? 0;
    m.ttl = Math.max(1, MESH_INITIAL_TTL - m.h);
    retained.set(r.id, m);
    await db.runAsync('INSERT OR IGNORE INTO mesh_seen (id, seen_at) VALUES (?, ?)', [r.id, Date.now()]);
  }
}

export async function startMesh(): Promise<void> {
  if (transport) return;
  const t = new NearbyTransport();
  transport = t;
  unsubs = [t.onMessage((m, from) => void onMessage(m, from)), t.onPeersChanged((p) => void onPeers(p))];
  try {
    await loadRetained();
    await t.start(currentUserId(), firstName(currentUserName()));
    useMesh.setState({ running: true, error: null });
  } catch (e) {
    useMesh.setState({ running: false, error: e instanceof Error ? e.message : String(e) });
    unsubs.forEach((u) => u());
    unsubs = [];
    transport = null;
  }
}

export async function stopMesh(): Promise<void> {
  const t = transport;
  transport = null;
  unsubs.forEach((u) => u());
  unsubs = [];
  knownConnected = new Set();
  await t?.stop();
  useMesh.setState({ running: false, peers: [] });
}

/** Publica un reporte propio por el mesh (además de la outbox). */
export async function publishReport(r: EmergencyReport): Promise<number> {
  const msg = reportToMessage(r, [firstName(r.author_name)]);
  await alreadySeen(msg.id);
  retained.set(msg.id, msg);
  if (!transport) return 0;
  await transport.broadcast(msg);
  inc('sent');
  return useMesh.getState().peers.filter((p) => p.connected).length;
}

export async function publishControl(on: boolean, emergencyType: string): Promise<void> {
  const msg: MeshMessage = {
    v: 1,
    id: `ctl-${on ? 'on' : 'off'}-${Date.now()}`,
    ttl: MESH_INITIAL_TTL,
    h: 0,
    t: on ? 'EMERGENCY_ON' : 'EMERGENCY_OFF',
    a: currentUserId(),
    n: currentUserName(),
    la: 0,
    lo: 0,
    m: emergencyType,
    ts: Date.now(),
  };
  await alreadySeen(msg.id);
  retained.set(msg.id, msg);
  await transport?.broadcast(msg);
}

export function connectedPeers(): number {
  return useMesh.getState().peers.filter((p) => p.connected).length;
}
