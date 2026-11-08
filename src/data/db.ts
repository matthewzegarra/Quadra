import * as SQLite from 'expo-sqlite';

// Base local offline-first. La UI SOLO lee de aquí; la red se sincroniza en segundo plano.
// Geografía de Postgres (PostGIS) → columnas lat/lng REAL. Arrays → TEXT con JSON.
// Booleanos → INTEGER 0/1.

export const DB_NAME = 'ayni.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Migraciones en orden. Nunca editar una ya publicada: agregar una nueva al final. */
const MIGRATIONS: string[] = [
  // v1: esquema inicial (espejo de supabase/migrations/0001_init.sql)
  `
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 1500,
    emergency_active INTEGER NOT NULL DEFAULT 0,
    emergency_type TEXT,
    emergency_started_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    phone_whatsapp TEXT,
    zone_id TEXT,
    home_lat REAL,
    home_lng REAL,
    is_zone_admin INTEGER NOT NULL DEFAULT 0,
    is_vulnerable INTEGER NOT NULL DEFAULT 0,
    aynis INTEGER NOT NULL DEFAULT 0,
    easy_mode INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT,
    zone_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('servicio','producto')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_hint TEXT,
    schedule TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    whatsapp TEXT,
    available_in_emergency INTEGER NOT NULL DEFAULT 0,
    emergency_capability TEXT,
    visto_bueno_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_listings_latlng ON listings(lat, lng);
  CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);

  CREATE TABLE IF NOT EXISTS vistos_buenos (
    id TEXT PRIMARY KEY NOT NULL,
    listing_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    comment TEXT,
    distance_m INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (listing_id, voter_id)
  );

  CREATE TABLE IF NOT EXISTS favors (
    id TEXT PRIMARY KEY NOT NULL,
    author_id TEXT,
    zone_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('pido','ofrezco','presto','dono','intercambio','movilidad')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','en_curso','resuelto')),
    accepted_response_id TEXT,
    mobility_destination TEXT,
    mobility_days TEXT,
    mobility_time TEXT,
    mobility_role TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_favors_type ON favors(type);

  CREATE TABLE IF NOT EXISTS favor_responses (
    id TEXT PRIMARY KEY NOT NULL,
    favor_id TEXT NOT NULL,
    responder_id TEXT NOT NULL,
    responder_name TEXT,
    message TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    location_source TEXT NOT NULL DEFAULT 'gps' CHECK (location_source IN ('gps','mapa')),
    location_label TEXT,
    distance_m INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'propuesto'
      CHECK (status IN ('propuesto','aceptado','agradecido','completado','retirado')),
    thanks_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (favor_id, responder_id)
  );
  CREATE INDEX IF NOT EXISTS idx_favor_responses_favor ON favor_responses(favor_id);

  CREATE TABLE IF NOT EXISTS emergency_reports (
    id TEXT PRIMARY KEY NOT NULL,
    author_id TEXT,
    author_name TEXT,
    zone_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('sos','estoy_bien','vulnerable','recurso_necesito','recurso_ofrezco')),
    need TEXT,
    description TEXT,
    people_count INTEGER DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 2,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','atendiendo','resuelto')),
    origin TEXT NOT NULL DEFAULT 'online' CHECK (origin IN ('online','mesh','sms')),
    mesh_hops INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_emergency_priority ON emergency_reports(priority, created_at);

  CREATE TABLE IF NOT EXISTS ayni_ledger (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref_id TEXT,
    created_at TEXT NOT NULL
  );

  -- Solo local: cola de escrituras pendientes de subir a Supabase.
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "table" TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );

  -- Solo local: marca de último pull por tabla.
  CREATE TABLE IF NOT EXISTS sync_state (
    "table" TEXT PRIMARY KEY NOT NULL,
    last_pulled_at TEXT
  );

  -- Solo local: ids de mensajes mesh ya vistos (deduplicación).
  CREATE TABLE IF NOT EXISTS mesh_seen (
    id TEXT PRIMARY KEY NOT NULL,
    seen_at INTEGER NOT NULL
  );
  `,
  // v2: outbox con más operaciones (insert idempotente y update parcial) y ruta mesh.
  `
  DROP TABLE IF EXISTS outbox;
  CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "table" TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('upsert','insert','update')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );
  ALTER TABLE emergency_reports ADD COLUMN mesh_path TEXT;
  `,
  // v3: revisión de publicaciones, zona pública y DNI (solo últimos 4, en este celular).
  `
  ALTER TABLE profiles ADD COLUMN first_name TEXT;
  ALTER TABLE profiles ADD COLUMN last_name TEXT;
  ALTER TABLE profiles ADD COLUMN demo_mode INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN public_home_lat REAL;
  ALTER TABLE profiles ADD COLUMN public_home_lng REAL;

  ALTER TABLE listings ADD COLUMN review_status TEXT NOT NULL DEFAULT 'aprobado';
  ALTER TABLE listings ADD COLUMN review_note TEXT;
  ALTER TABLE listings ADD COLUMN public_lat REAL;
  ALTER TABLE listings ADD COLUMN public_lng REAL;

  ALTER TABLE favors ADD COLUMN review_status TEXT NOT NULL DEFAULT 'aprobado';
  ALTER TABLE favors ADD COLUMN review_note TEXT;
  ALTER TABLE favors ADD COLUMN public_lat REAL;
  ALTER TABLE favors ADD COLUMN public_lng REAL;

  ALTER TABLE emergency_reports ADD COLUMN review_status TEXT NOT NULL DEFAULT 'aprobado';
  ALTER TABLE emergency_reports ADD COLUMN review_note TEXT;
  ALTER TABLE emergency_reports ADD COLUMN public_lat REAL;
  ALTER TABLE emergency_reports ADD COLUMN public_lng REAL;

  ALTER TABLE favor_responses ADD COLUMN public_lat REAL;
  ALTER TABLE favor_responses ADD COLUMN public_lng REAL;

  ALTER TABLE ayni_ledger ADD COLUMN updated_at TEXT;

  CREATE TABLE IF NOT EXISTS moderation_log (
    id TEXT PRIMARY KEY NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    moderator_id TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_private (
    user_id TEXT PRIMARY KEY NOT NULL,
    dni_last4 TEXT
  );
  `,
];

/** Columnas que existen solo en el celular (no se envían a Supabase). */
export const LOCAL_ONLY_COLUMNS: Record<string, string[]> = {
  emergency_reports: ['mesh_path'],
};

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(sql);
      await txn.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

/** Abre (una sola vez) la base local y aplica migraciones pendientes. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null; // permitir reintento
      throw e;
    });
  }
  return dbPromise;
}

/** Tablas que se sincronizan con Supabase (mismo nombre en ambos lados). */
export const SYNCED_TABLES = [
  'zones',
  'profiles',
  'listings',
  'vistos_buenos',
  'favors',
  'favor_responses',
  'emergency_reports',
  'ayni_ledger',
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];
