import type { RealtimeChannel } from '@supabase/supabase-js';
import { getDb, LOCAL_ONLY_COLUMNS } from '@/data/db';
import { putLocal, refreshPendingCount } from '@/data/repositories/base';
import { bumpTables, useSyncState } from '@/data/store';
import { useConnectivity } from '@/lib/connectivity';
import { supabase } from '@/lib/supabase';

// Motor de sincronización offline-first (prompt.md §4):
//  push: outbox → Supabase en orden (idempotente por id)
//  pull: filas con updated_at > last_pulled_at por tabla
//  realtime: emergency_reports y zones

const BOOL_COLS: Record<string, string[]> = {
  zones: ['emergency_active'],
  profiles: ['is_zone_admin', 'is_vulnerable', 'easy_mode'],
  listings: ['available_in_emergency', 'is_active'],
};
const ARRAY_COLS: Record<string, string[]> = { favors: ['mobility_days'] };

/** Columnas que el servidor protege o genera: no se envían. */
const SERVER_MANAGED: Record<string, string[]> = {
  profiles: ['aynis', 'is_zone_admin'],
  listings: ['visto_bueno_count'],
};

const PULL_TABLES = [
  'zones',
  'profiles',
  'listings',
  'vistos_buenos',
  'favors',
  'favor_responses',
  'emergency_reports',
] as const;

type Row = Record<string, unknown>;

export function toServer(table: string, row: Row): Row {
  const out: Row = { ...row };
  for (const c of LOCAL_ONLY_COLUMNS[table] ?? []) delete out[c];
  for (const c of SERVER_MANAGED[table] ?? []) delete out[c];
  delete out.updated_at; // lo fija el servidor
  for (const c of BOOL_COLS[table] ?? []) if (c in out && out[c] !== null) out[c] = Boolean(out[c]);
  for (const c of ARRAY_COLS[table] ?? []) {
    if (typeof out[c] === 'string') {
      try {
        out[c] = JSON.parse(out[c] as string);
      } catch {
        out[c] = null;
      }
    }
  }
  return out;
}

const columnCache: Record<string, Set<string>> = {};
async function localColumns(table: string): Promise<Set<string>> {
  if (columnCache[table]) return columnCache[table];
  const db = await getDb();
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  columnCache[table] = new Set(cols.map((c) => c.name));
  return columnCache[table];
}

export async function fromServer(table: string, row: Row): Promise<Row> {
  const cols = await localColumns(table);
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!cols.has(k)) continue; // descarta location/center/home generadas y uploaded_by
    if (typeof v === 'boolean') out[k] = v ? 1 : 0;
    else if (Array.isArray(v)) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

/** Hook para que otras capas reaccionen a filas nuevas que llegan del servidor. */
type IncomingListener = (table: string, row: Row, isNew: boolean) => void;
const incomingListeners = new Set<IncomingListener>();
export function onIncomingRow(cb: IncomingListener): () => void {
  incomingListeners.add(cb);
  return () => incomingListeners.delete(cb);
}

async function storeIncoming(table: string, serverRow: Row) {
  const row = await fromServer(table, serverRow);
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(`SELECT id FROM ${table} WHERE id = ?`, [
    row.id as string,
  ]);
  if (table === 'emergency_reports' && existing) {
    // Nunca pisamos origen/saltos locales del mesh: solo actualizamos status.
    await db.runAsync('UPDATE emergency_reports SET status = ?, updated_at = ? WHERE id = ?', [
      row.status as string,
      row.updated_at as string,
      row.id as string,
    ]);
  } else {
    await putLocal(table, row);
  }
  incomingListeners.forEach((cb) => cb(table, row, !existing));
}

function isNetworkError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (!err.code) return true; // fetch falló: no hay código de Postgres/PostgREST
  return /network|fetch|timeout/i.test(err.message ?? '');
}

async function push(): Promise<boolean> {
  if (!supabase) return false;
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; table: string; op: string; payload: string; attempts: number }>(
    'SELECT id, "table", op, payload, attempts FROM outbox ORDER BY id LIMIT 200',
  );
  for (const item of rows) {
    const payload = JSON.parse(item.payload) as Row;
    const body = toServer(item.table, payload);
    let error: { code?: string; message?: string } | null = null;
    if (item.op === 'update') {
      const { id, ...patch } = body;
      ({ error } = await supabase.from(item.table).update(patch).eq('id', id as string));
    } else {
      ({ error } = await supabase
        .from(item.table)
        .upsert(body, { onConflict: 'id', ignoreDuplicates: item.op === 'insert' }));
    }
    if (!error) {
      await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);
      continue;
    }
    if (isNetworkError(error)) return false; // sin red: reintentamos luego, en orden
    // Error permanente (RLS, regla de negocio): 3 intentos y se descarta para no bloquear la cola.
    console.warn(`[sync] ${item.table}/${item.op} rechazado:`, error.message);
    if (item.attempts + 1 >= 3) {
      await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);
    } else {
      await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', [
        error.message ?? 'error',
        item.id,
      ]);
    }
    useSyncState.getState().set({ lastError: error.message ?? null });
  }
  return true;
}

async function pull(): Promise<boolean> {
  if (!supabase) return false;
  const db = await getDb();
  const touched: string[] = [];
  for (const table of PULL_TABLES) {
    const state = await db.getFirstAsync<{ last_pulled_at: string | null }>(
      'SELECT last_pulled_at FROM sync_state WHERE "table" = ?',
      [table],
    );
    let since = state?.last_pulled_at ?? '1970-01-01T00:00:00Z';
    for (let page = 0; page < 10; page++) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(500);
      if (error) {
        if (isNetworkError(error)) return false;
        console.warn(`[sync] pull ${table}:`, error.message);
        break;
      }
      if (!data?.length) break;
      for (const r of data) await storeIncoming(table, r as Row);
      since = (data[data.length - 1] as Row).updated_at as string;
      await db.runAsync('INSERT OR REPLACE INTO sync_state ("table", last_pulled_at) VALUES (?, ?)', [table, since]);
      touched.push(table);
      if (data.length < 500) break;
    }
  }
  if (touched.length) bumpTables(...touched);
  return true;
}

let running: Promise<void> | null = null;

/** Un ciclo completo push → pull. Seguro de llamar varias veces (no se superpone). */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const { authed } = engineState;
    if (!supabase || !authed || !useConnectivity.getState().isOnline) return;
    useSyncState.getState().set({ syncing: true });
    try {
      const pushed = await push();
      const pulled = pushed && (await pull());
      if (pushed && pulled) useSyncState.getState().set({ lastSyncAt: Date.now(), lastError: null });
    } catch (e) {
      console.warn('[sync] ciclo falló', e);
    } finally {
      await refreshPendingCount();
      useSyncState.getState().set({ syncing: false });
      running = null;
    }
  })();
  return running;
}

const engineState = { authed: false, timer: null as ReturnType<typeof setInterval> | null, channel: null as RealtimeChannel | null };

function subscribeRealtime() {
  if (!supabase || engineState.channel) return;
  const handle = (table: string) => (payload: { new: Row }) => {
    if (!payload.new || !('id' in payload.new)) return;
    storeIncoming(table, payload.new).then(() => bumpTables(table));
  };
  engineState.channel = supabase
    .channel('ayni-emergencia')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, handle('emergency_reports'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, handle('zones'))
    .subscribe();
}

/** Arranca el motor cuando hay sesión. Intervalo: 30 s normal, 10 s en emergencia. */
export function startSyncEngine(intervalMs = 30_000) {
  engineState.authed = true;
  subscribeRealtime();
  if (engineState.timer) clearInterval(engineState.timer);
  engineState.timer = setInterval(() => void syncNow(), intervalMs);
  void syncNow();
}

export function setSyncInterval(intervalMs: number) {
  if (!engineState.authed) return;
  if (engineState.timer) clearInterval(engineState.timer);
  engineState.timer = setInterval(() => void syncNow(), intervalMs);
}
