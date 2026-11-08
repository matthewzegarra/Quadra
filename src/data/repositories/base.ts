import { getDb } from '@/data/db';
import { bumpTables, useSyncState } from '@/data/store';
import { nowIso } from '@/lib/ids';

// Toda escritura pasa por aquí: primero SQLite, luego una fila en la outbox.
// El SyncEngine la sube a Supabase cuando hay internet.

export type OutboxOp = 'upsert' | 'insert' | 'update';

type Row = Record<string, unknown>;

async function enqueue(table: string, op: OutboxOp, payload: Row) {
  const db = await getDb();
  await db.runAsync('INSERT INTO outbox ("table", op, payload, created_at) VALUES (?, ?, ?, ?)', [
    table,
    op,
    JSON.stringify(payload),
    nowIso(),
  ]);
  await refreshPendingCount();
}

export async function refreshPendingCount() {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox');
  useSyncState.getState().set({ pending: r?.n ?? 0 });
}

function toSqlValue(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return v as string | number;
}

/** INSERT OR REPLACE local (sin outbox). Lo usan seed, pull y realtime. */
export async function putLocal(table: string, row: Row, mode: 'replace' | 'ignore' = 'replace') {
  const db = await getDb();
  const cols = Object.keys(row);
  const sql = `INSERT OR ${mode === 'replace' ? 'REPLACE' : 'IGNORE'} INTO ${table} (${cols
    .map((c) => `"${c}"`)
    .join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  const res = await db.runAsync(
    sql,
    cols.map((c) => toSqlValue(row[c])),
  );
  return res.changes;
}

/** Crea o reemplaza una fila propia y la encola para subir. */
export async function saveRow(table: string, row: Row, op: 'upsert' | 'insert' = 'upsert') {
  const now = nowIso();
  const full = { created_at: now, ...row, updated_at: now };
  await putLocal(table, full, op === 'insert' ? 'ignore' : 'replace');
  await enqueue(table, op, full);
  bumpTables(table);
  return full;
}

/** Actualización parcial por id (p. ej. cambiar un status) + outbox. */
export async function patchRow(table: string, id: string, patch: Row, opts: { enqueue?: boolean } = {}) {
  const db = await getDb();
  const full: Row = { ...patch, updated_at: nowIso() };
  const cols = Object.keys(full);
  await db.runAsync(`UPDATE ${table} SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE id = ?`, [
    ...cols.map((c) => toSqlValue(full[c])),
    id,
  ]);
  if (opts.enqueue !== false) await enqueue(table, 'update', { id, ...full });
  bumpTables(table);
}

/** Encola una fila que llegó por otro medio (mesh) para que la suba quien tenga internet. */
export async function enqueueOnly(table: string, op: OutboxOp, payload: Row) {
  await enqueue(table, op, payload);
}
