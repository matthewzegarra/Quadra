// Genera los datos demo (100 % ficticios) del barrio Lince en dos formatos con los MISMOS ids:
//   src/seed/seed.json   → se carga en SQLite al primer inicio (demo sin internet)
//   supabase/seed.sql    → se carga en Supabase (npm run seed y luego aplicar el SQL)
// Uso: node scripts/build-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CENTER = { lat: -12.0846, lng: -77.0353 };
const ZONE_ID = 'a0000000-0000-4000-8000-000000000001';

// Desplazamiento en metros (este, norte) → lat/lng
function at(dx, dy) {
  const lat = CENTER.lat + dy / 110574;
  const lng = CENTER.lng + dx / (111320 * Math.cos((CENTER.lat * Math.PI) / 180));
  return { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
}
const pid = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const lid = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const fid = (n) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rid = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const eid = (n) => `f0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const zone = { id: ZONE_ID, name: 'Lince - Sector 3', district: 'Lince', ...CENTER, radius_m: 1500 };

// ── Personas (ficticias) ──
const P = {
  rosa: { n: 1, name: 'Rosa Quispe', home: at(150, -100), aynis: 18 },
  pedro: { n: 2, name: 'Don Pedro Huamán', home: at(-80, 90), aynis: 4, vulnerable: true },
  carla: { n: 3, name: 'Carla Mendoza', home: at(250, 200), aynis: 12 },
  luis: { n: 4, name: 'Luis Torres', home: at(180, 60), aynis: 27 },
  miguel: { n: 5, name: 'Miguel Rojas', home: at(-300, -150), aynis: 22 },
  ana: { n: 6, name: 'Ana Flores', home: at(-420, 250), aynis: 31 },
  jorge: { n: 7, name: 'Jorge Salazar', home: at(600, -500), aynis: 15 },
  lucia: { n: 8, name: 'Prof. Lucía Ramos', home: at(-650, -300), aynis: 19 },
  sofia: { n: 9, name: 'Sofía Paredes', home: at(400, 700), aynis: 9 },
  junta: { n: 10, name: 'Junta Vecinal Lince Sector 3', home: at(0, 0), aynis: 40, admin: true },
  marco: { n: 11, name: 'Marco Díaz', home: at(320, 260), aynis: 6 },
  raul: { n: 12, name: 'Raúl Cárdenas', home: at(-150, 420), aynis: 11 },
  elena: { n: 13, name: 'Elena Vargas', home: at(500, 100), aynis: 14 },
  kevin: { n: 14, name: 'Kevin Ramos', home: at(-200, -500), aynis: 3 },
};
const profiles = Object.values(P).map((p) => ({
  id: pid(p.n),
  display_name: p.name,
  phone_whatsapp: null, // sin teléfonos reales (privacidad)
  zone_id: ZONE_ID,
  home_lat: p.home.lat,
  home_lng: p.home.lng,
  is_zone_admin: p.admin ? 1 : 0,
  is_vulnerable: p.vulnerable ? 1 : 0,
  aynis: p.aynis,
  easy_mode: 0,
}));

// ── Módulo 1: Servicios de Proximidad ──
const L = (n, owner, kind, category, title, extra, pos) => ({
  id: lid(n),
  owner_id: pid(owner.n),
  zone_id: ZONE_ID,
  kind,
  category,
  title,
  description: extra.description ?? null,
  price_hint: extra.price ?? null,
  schedule: extra.schedule ?? null,
  ...(pos ?? owner.home),
  whatsapp: null,
  available_in_emergency: extra.emergency ? 1 : 0,
  emergency_capability: extra.emergency ?? null,
  visto_bueno_count: extra.vb ?? 0,
  is_active: 1,
});
const listings = [
  L(1, P.luis, 'servicio', 'gasfiteria', 'Luis Torres · Gasfitero', { description: 'Gasfitero · 12 años de experiencia. Fugas, caños, termas y desagües.', price: 'Desde S/ 40', schedule: 'Lun a sáb · 8am a 6pm', vb: 5, emergency: 'Corta fugas de agua y gas' }),
  L(2, P.rosa, 'producto', 'comida', 'Lasañas caseras de Rosa', { description: 'Lasaña de carne o de verduras, porción familiar. Pedidos hasta el viernes.', price: 'S/ 15', schedule: 'Sábados', vb: 7 }),
  L(3, P.rosa, 'producto', 'comida', 'Pastelitos y alfajores de Rosa', { description: 'Alfajores de maicena, empanaditas dulces y pie de manzana.', price: 'S/ 2 c/u', schedule: 'Todos los días', vb: 4 }, at(160, -90)),
  L(4, P.miguel, 'servicio', 'cerrajeria', 'Miguel Rojas · Cerrajero 24 h', { description: 'Abro puertas, cambio chapas y hago copias de llaves.', price: 'Desde S/ 30', schedule: 'Todos los días · 24 horas', vb: 6, emergency: 'Abre puertas trabadas' }),
  L(5, P.ana, 'servicio', 'salud', 'Ana Flores · Enfermera a domicilio', { description: 'Inyectables, curaciones, control de presión y glucosa.', price: 'S/ 25', schedule: 'Lun a sáb · 7am a 9pm', vb: 7, emergency: 'Enfermera · primeros auxilios' }),
  L(6, P.jorge, 'servicio', 'electricidad', 'Jorge Salazar · Electricista', { description: 'Instalaciones, tableros, cortocircuitos. Tengo generador.', price: 'A convenir', schedule: 'Lun a vie · 9am a 6pm', vb: 3, emergency: 'Electricista · tengo generador' }),
  L(7, P.lucia, 'servicio', 'clases', 'Clases de matemática · Prof. Lucía', { description: 'Primaria y secundaria. Preparación para exámenes.', price: 'S/ 20 la hora', schedule: 'Lun a vie · 4pm a 8pm', vb: 5 }),
  L(8, P.sofia, 'servicio', 'mascotas', 'Paseo de perros con Sofía', { description: 'Paseos de 45 minutos en grupo pequeño por el parque.', price: 'S/ 10 el paseo', schedule: 'Mañanas', vb: 4 }),
  L(9, P.raul, 'servicio', 'carpinteria', 'Raúl Cárdenas · Carpintero', { description: 'Muebles a medida, puertas, arreglos de cajones y repisas.', price: 'Desde S/ 50', schedule: 'Lun a sáb', vb: 2 }),
  L(10, P.elena, 'producto', 'comida', 'Tamales de Doña Elena', { description: 'Tamales de cerdo y de pollo, con su sarsa criolla.', price: 'S/ 5', schedule: 'Domingos en la mañana', vb: 6 }),
  L(11, P.kevin, 'servicio', 'otros', 'Reparación de celulares', { description: 'Cambio de pantalla, batería y pin de carga.', price: 'Desde S/ 40', schedule: 'Lun a sáb · 10am a 7pm', vb: 1 }),
  L(12, P.elena, 'servicio', 'otros', 'Costura y arreglos de ropa', { description: 'Basta, cierres, ajustes y remiendos.', price: 'Desde S/ 8', schedule: 'Lun a vie', vb: 3 }, at(510, 90)),
  L(13, P.lucia, 'servicio', 'clases', 'Inglés para niños', { description: 'Clases divertidas para niños de 6 a 12 años.', price: 'S/ 18 la hora', schedule: 'Sábados · 9am a 1pm', vb: 2 }, at(-640, -310)),
  L(14, P.jorge, 'servicio', 'transporte', 'Mudanzas pequeñas en camioneta', { description: 'Fletes dentro de Lima, ayudo a cargar.', price: 'A convenir', schedule: 'Fines de semana', vb: 3, emergency: 'Tengo camioneta para traslados' }, at(610, -490)),
  L(15, P.kevin, 'servicio', 'gasfiteria', 'Gasfitería rápida Kevin', { description: 'Destoro de desagües y cambio de grifería.', price: 'Desde S/ 35', schedule: 'Lun a dom', vb: 1 }, at(-900, 800)),
  L(16, P.sofia, 'servicio', 'otros', 'Corte de cabello a domicilio', { description: 'Corte para niños, adultos y adultos mayores.', price: 'S/ 15', schedule: 'Tardes', vb: 2 }, at(390, 690)),
  L(17, P.elena, 'producto', 'comida', 'Mermeladas caseras', { description: 'Fresa, aguaymanto y piña. Frasco de 250 g.', price: 'S/ 12', schedule: 'Todos los días', vb: 0 }, at(495, 110)),
  L(18, P.raul, 'servicio', 'electricidad', 'Electricista Raúl (Jesús María)', { description: 'Instalaciones eléctricas en general.', price: 'A convenir', schedule: 'Lun a sáb', vb: 2 }, at(1800, 1300)),
];

// ── Módulo 2: Cadena de Favores ──
const F = (n, author, type, category, title, description, minutesAgo, extra = {}, pos) => ({
  id: fid(n),
  author_id: pid(author.n),
  zone_id: ZONE_ID,
  type,
  category,
  title,
  description,
  ...(pos ?? author.home),
  status: 'abierto',
  accepted_response_id: null,
  mobility_destination: extra.destination ?? null,
  mobility_days: extra.days ?? null,
  mobility_time: extra.time ?? null,
  mobility_role: extra.role ?? null,
  minutesAgo,
});
const WEEK = ['lun', 'mar', 'mie', 'jue', 'vie'];
const favors = [
  F(1, P.pedro, 'pido', 'salud', 'Necesito muletas prestadas por 2 semanas', 'Me lesioné la rodilla. Las devuelvo limpias, ¡gracias vecinos!', 20),
  F(2, P.miguel, 'presto', 'herramientas', 'Presto mi taladro', 'Hoy hasta las 6 pm. Con brocas para pared.', 90),
  F(3, P.sofia, 'dono', 'materiales', 'Dono ropa de niño (talla 6 a 8)', 'Polos, pantalones y una casaca en buen estado.', 180),
  F(4, P.lucia, 'intercambio', 'habilidades', 'Te enseño Excel, me enseñas a cocinar', 'Puedo enseñarte tablas y fórmulas. Quiero aprender a hacer ají de gallina.', 300),
  F(5, P.carla, 'movilidad', 'movilidad', 'Llevo al Colegio San Antonio a las 7:15', 'Tengo 2 asientos libres en el auto.', 60, { destination: 'Colegio San Antonio', days: WEEK, time: '07:15', role: 'llevo' }),
  F(6, P.marco, 'movilidad', 'movilidad', 'Busco quién lleve a mi hijo al Colegio San Antonio', 'Mi hijo está en 3.° grado. Puedo compartir la gasolina.', 45, { destination: 'Colegio San Antonio', days: WEEK, time: '07:15', role: 'busco' }),
  F(7, P.rosa, 'pido', 'herramientas', 'Necesito un martillo', 'Para hoy · lo devuelvo en la noche.', 35),
];

const R = (n, favorN, responder, message, minutesAgo) => {
  const favor = favors[favorN - 1];
  const d = Math.round(
    Math.hypot((responder.home.lat - favor.lat) * 110574, (responder.home.lng - favor.lng) * 111320 * Math.cos((CENTER.lat * Math.PI) / 180)),
  );
  return {
    id: rid(n),
    favor_id: favor.id,
    responder_id: pid(responder.n),
    responder_name: responder.name,
    message,
    ...responder.home,
    location_source: 'gps',
    location_label: null,
    distance_m: d,
    status: 'propuesto',
    thanks_message: null,
    minutesAgo,
  };
};
const favorResponses = [
  R(1, 7, P.miguel, 'Lo tengo, pasa cuando quieras', 30),
  R(2, 7, P.ana, 'Te lo llevo en la tarde', 25),
  R(3, 7, P.jorge, 'Tengo uno grande y uno chico', 20),
  R(4, 1, P.ana, 'Tengo unas muletas de mi mamá, te las presto', 10),
];

// ── Modo Emergencia (se carga en el celular al activar el modo) ──
const E = (n, author, kind, need, description, people, priority, minutesAgo, extra = {}) => ({
  id: eid(n),
  author_id: pid(author.n),
  author_name: author.name,
  zone_id: ZONE_ID,
  kind,
  need,
  description,
  people_count: people,
  priority,
  ...(extra.pos ?? author.home),
  status: 'abierto',
  origin: extra.origin ?? 'online',
  mesh_hops: extra.hops ?? 0,
  minutesAgo,
});
const emergencyDemo = [
  E(1, P.rosa, 'sos', 'baldes', 'Casa inundada · necesita baldes', 4, 1, 3, { origin: 'mesh', hops: 2 }),
  E(2, P.pedro, 'vulnerable', 'rescate', 'Don Pedro · 78 años, vive solo. ¿Puedes ir a verlo?', 1, 1, 8),
  E(3, P.carla, 'estoy_bien', null, 'Estamos bien en casa', 3, 3, 6),
  E(4, P.luis, 'estoy_bien', null, 'Todo bien por aquí', 2, 3, 9),
  E(5, P.sofia, 'estoy_bien', null, 'Bien, sin daños', 1, 3, 11),
  E(6, P.ana, 'recurso_ofrezco', 'agua', 'Tengo 20 litros de agua hervida', 0, 3, 7),
  E(7, P.jorge, 'recurso_ofrezco', 'energia', 'Generador: carga celulares', 0, 3, 5),
  E(8, P.lucia, 'recurso_necesito', 'medicinas', 'Necesito insulina para mi mamá', 2, 2, 4),
];

// ── Salida 1: seed.json ──
const seed = { zone, profiles, listings, favors, favorResponses, emergencyDemo };
mkdirSync(join(root, 'src/seed'), { recursive: true });
writeFileSync(join(root, 'src/seed/seed.json'), JSON.stringify(seed, null, 2) + '\n');

// ── Salida 2: seed.sql ──
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a ? `array[${a.map(q).join(',')}]::text[]` : 'null');
const bool = (v) => (v ? 'true' : 'false');
const ago = (m) => `now() - interval '${m} minutes'`;

let sql = `-- Datos demo ficticios (generado por scripts/build-seed.mjs; no editar a mano)
-- Aplicar con el rol postgres (SQL Editor o conector de Supabase).
begin;
select set_config('ayni.internal', '1', true);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
${profiles.map((p) => `  (${q(p.id)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now(), '{}'::jsonb, '{}'::jsonb)`).join(',\n')}
on conflict (id) do nothing;

insert into public.zones (id, name, district, lat, lng, radius_m)
values (${q(zone.id)}, ${q(zone.name)}, ${q(zone.district)}, ${zone.lat}, ${zone.lng}, ${zone.radius_m})
on conflict (id) do update set name = excluded.name;

insert into public.profiles (id, display_name, zone_id, home_lat, home_lng, is_zone_admin, is_vulnerable, aynis)
values
${profiles.map((p) => `  (${q(p.id)}, ${q(p.display_name)}, ${q(p.zone_id)}, ${p.home_lat}, ${p.home_lng}, ${bool(p.is_zone_admin)}, ${bool(p.is_vulnerable)}, ${p.aynis})`).join(',\n')}
on conflict (id) do update set display_name = excluded.display_name, aynis = excluded.aynis;

insert into public.listings (id, owner_id, zone_id, kind, category, title, description, price_hint, schedule, lat, lng, available_in_emergency, emergency_capability, visto_bueno_count)
values
${listings.map((l) => `  (${[l.id, l.owner_id, l.zone_id, l.kind, l.category, l.title, l.description, l.price_hint, l.schedule].map(q).join(', ')}, ${l.lat}, ${l.lng}, ${bool(l.available_in_emergency)}, ${q(l.emergency_capability)}, ${l.visto_bueno_count})`).join(',\n')}
on conflict (id) do update set visto_bueno_count = excluded.visto_bueno_count, title = excluded.title;

insert into public.favors (id, author_id, zone_id, type, category, title, description, lat, lng, mobility_destination, mobility_days, mobility_time, mobility_role, created_at)
values
${favors.map((f) => `  (${[f.id, f.author_id, f.zone_id, f.type, f.category, f.title, f.description].map(q).join(', ')}, ${f.lat}, ${f.lng}, ${q(f.mobility_destination)}, ${arr(f.mobility_days)}, ${q(f.mobility_time)}, ${q(f.mobility_role)}, ${ago(f.minutesAgo)})`).join(',\n')}
on conflict (id) do nothing;

insert into public.favor_responses (id, favor_id, responder_id, responder_name, message, lat, lng, location_source, distance_m, created_at)
values
${favorResponses.map((r) => `  (${[r.id, r.favor_id, r.responder_id, r.responder_name, r.message].map(q).join(', ')}, ${r.lat}, ${r.lng}, 'gps', ${r.distance_m}, ${ago(r.minutesAgo)})`).join(',\n')}
on conflict (id) do nothing;

-- PIN de la junta vecinal para la demo (Perfil → "Soy de la junta vecinal")
insert into public.zone_admin_codes (zone_id, code) values (${q(zone.id)}, '2026')
on conflict (zone_id) do update set code = excluded.code;

commit;
`;
writeFileSync(join(root, 'supabase/seed.sql'), sql);
console.log(`seed.json y seed.sql generados: ${profiles.length} perfiles, ${listings.length} servicios, ${favors.length} favores, ${emergencyDemo.length} reportes de emergencia.`);
