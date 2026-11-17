// Pruebas de la lógica pura de Quadra (sin celular ni emulador): `npm run test:logic`
// Transpila los .ts con el TypeScript del proyecto y resuelve los alias "@/…" a src/.
// Cubre los bugs de la final: bucle del Modo Emergencia, fechas, hora de movilidad, voz y mesh.

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const SRC = path.join(__dirname, '..', 'src');

// Dobles de prueba para módulos nativos que no existen en Node
const STUBS = {
  '@/data/db': { getDb: async () => globalThis.__fakeDb },
};

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (STUBS[request]) return request;
  if (request.startsWith('@/')) {
    const base = path.join(SRC, request.slice(2));
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(base + ext)) return base + ext;
  }
  return origResolve.call(this, request, parent, ...rest);
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (STUBS[request]) return STUBS[request];
  return origLoad.call(this, request, ...rest);
};
Module._extensions['.ts'] = function (module, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { computeEmergencyMode, emergencyKey } = require('@/data/emergencyMode');
const { reloadZone, useZoneStore, watchZone } = require('@/data/zoneStore');
const { bumpTables } = require('@/data/store');
const { parseTimestamp, timeAgo } = require('@/features/catalog');
const { normalizeTime } = require('@/features/publish/time');
const { parseVoiceOffline } = require('@/features/voice/parseVoiceOffline');
const { isValidMeshMessage } = require('@/mesh/MeshTransport');

const zoneOn = { emergency_active: 1, emergency_type: 'sismo', emergency_started_at: '2026-11-11T00:13:42.119Z' };
const zoneOff = { emergency_active: 0, emergency_type: 'sismo', emergency_started_at: '2026-11-11T00:13:42.119Z' };

test('Modo Emergencia: la zona está en memoria antes del primer render (sin bucle de redirecciones)', async () => {
  let row = { id: 'a0000000-0000-4000-8000-000000000001', ...zoneOn };
  globalThis.__fakeDb = { getFirstAsync: async () => row };
  assert.equal(useZoneStore.getState().loaded, false);
  await reloadZone();
  // Todas las pantallas leen exactamente lo mismo, de forma síncrona:
  const a = computeEmergencyMode(useZoneStore.getState().zone, false, null);
  const b = computeEmergencyMode(useZoneStore.getState().zone, false, null);
  assert.equal(useZoneStore.getState().loaded, true);
  assert.equal(a.active, true);
  assert.deepEqual(a, b);

  // La junta apaga la emergencia: al escribir en `zones` el store se recarga solo
  watchZone();
  row = { ...row, ...zoneOff };
  bumpTables('zones');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(computeEmergencyMode(useZoneStore.getState().zone, false, null).active, false);
});

test('Modo Emergencia: el vecino puede ver la app normal y una nueva emergencia vuelve a mostrarse', () => {
  const key = emergencyKey(zoneOn);
  assert.equal(computeEmergencyMode(zoneOn, false, null).active, true);
  assert.equal(computeEmergencyMode(zoneOn, false, key).active, false);
  assert.equal(computeEmergencyMode(zoneOn, false, key).dismissed, true);
  // SOS local siempre gana
  assert.equal(computeEmergencyMode(zoneOn, true, key).active, true);
  // La junta la reactiva (otra hora de inicio) → se muestra de nuevo
  const again = { ...zoneOn, emergency_started_at: '2026-11-17T20:00:00.000Z' };
  assert.equal(computeEmergencyMode(again, false, key).active, true);
  // Sin zona cargada no hay emergencia oficial
  assert.equal(computeEmergencyMode(null, false, null).active, false);
});

test('Fechas: formatos de Postgres y del celular, nunca NaN', () => {
  const now = Date.now();
  const pg = new Date(now - 3 * 60_000).toISOString().replace('T', ' ').replace('Z', '123+00');
  assert.ok(!Number.isNaN(parseTimestamp(pg)), pg);
  assert.equal(timeAgo(pg), 'hace 3 min');
  assert.equal(timeAgo(new Date(now - 5_000).toISOString()), 'hace un momento');
  assert.equal(timeAgo(new Date(now + 60 * 60_000).toISOString()), 'hace un momento'); // reloj adelantado
  assert.equal(timeAgo(new Date(now - 26 * 3600_000).toISOString()), 'hace 1 día');
  assert.equal(timeAgo('no es fecha'), '');
  assert.equal(timeAgo(null), '');
});

test('Movilidad: la hora escrita a mano se normaliza', () => {
  assert.equal(normalizeTime('7:15'), '07:15');
  assert.equal(normalizeTime('7.15'), '07:15');
  assert.equal(normalizeTime('7 15'), '07:15');
  assert.equal(normalizeTime('715'), '07:15');
  assert.equal(normalizeTime('7'), '07:00');
  assert.equal(normalizeTime('1:30 pm'), '13:30');
  assert.equal(normalizeTime('25:00'), '25:00');
  assert.equal(normalizeTime(''), '');
});

test('Voz sin internet: vender artículos y comida', () => {
  const bici = parseVoiceOffline('vendo mi bicicleta usada a 200 soles');
  assert.equal(bici.module, 'listing');
  assert.equal(bici.kind, 'producto');
  assert.equal(bici.category, 'articulos');
  assert.equal(bici.price_hint, 'S/ 200');
  const lasana = parseVoiceOffline('vendo lasañas a 15 soles los sábados');
  assert.equal(lasana.kind, 'producto');
  assert.equal(lasana.category, 'comida');
  const movi = parseVoiceOffline('llevo a mi hija al colegio san antonio a las 7:15');
  assert.equal(movi.type, 'movilidad');
  const sos = parseVoiceOffline('socorro se inunda mi casa necesito baldes');
  assert.equal(sos.module, 'emergency');
  assert.equal(sos.need, 'baldes');
});

test('Red vecinal: se descartan mensajes falsos o malformados', () => {
  const ok = { v: 1, id: 'abcdef12-3456', ttl: 6, h: 0, t: 'SOS', a: 'x', n: 'Rosa', la: -12.08, lo: -77.03, ts: Date.now() };
  assert.equal(isValidMeshMessage(ok), true);
  assert.equal(isValidMeshMessage({ ...ok, t: 'HACK' }), false);
  assert.equal(isValidMeshMessage({ ...ok, ttl: 99 }), false);
  assert.equal(isValidMeshMessage({ ...ok, la: 200 }), false);
  assert.equal(isValidMeshMessage({ ...ok, ts: Date.now() + 3600_000 }), false);
  assert.equal(isValidMeshMessage({ ...ok, m: 'x'.repeat(500) }), false);
  assert.equal(isValidMeshMessage(null), false);
});
