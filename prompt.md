# PROMPT PARA CLAUDE CODE · App Vecinal "AYNI" · Hackathon UTP El Comercio 2026 · Equipo PEAK

> Nombre de trabajo: **Ayni** (reciprocidad andina: hoy te ayudo, mañana me ayudas). Si el equipo cambia el nombre, reemplázalo en `app.json`, textos y landing.

---

## 0. Cómo quiero que trabajes

- Eres el desarrollador principal de un equipo de 4 a 5 personas en una hackatón de **48 horas** (cierre: **domingo 8 de noviembre de 2026, 7:00 p. m. hora Perú**). El tiempo es el recurso más escaso.
- Trabaja **por fases** (sección 12). Al terminar cada fase: la app compila, corre en Android y se hace commit. Nunca dejes la rama `main` rota.
- Antes de cada fase, muéstrame un plan corto de archivos a crear o modificar. Luego ejecútalo sin pedir permiso para cada archivo.
- Prioriza **funcionalidad real sobre pantallas bonitas vacías**. El jurado dijo literalmente: *"necesitamos ver su código, no solamente el diseño"*.
- Si algo bloquea más de 30 minutos, aplica el **plan de corte** (sección 13) y sigue.
- No inventes APIs. Si dudas de cómo funciona una librería, revisa su documentación o el código en `node_modules`.
- Código en **TypeScript**, comentarios en español, nombres de variables en inglés.
- **Nunca** subas secretos al repo. Usa `.env` (en `.gitignore`) y `app.config.ts` con variables `EXPO_PUBLIC_*` solo para lo que es público (URL y anon key de Supabase).
- El diseño visual de referencia está en la carpeta **`/design`** del repo (lee `design/README.md`, los `.dc.html` de `design/pantallas/` y, si existen, las imágenes de `design/capturas/`). Son referencia visual, no código: reconstruye cada pantalla en React Native copiando colores, tamaños, textos y estructura. Canvas original: https://claude.ai/artifact/VptdYgPJYSjwWYFNKCbeSX (11 pantallas: Tutorial, Cerca de ti, Detalle + Visto Bueno, Publicar, Confirmar por voz, Cadena de Favores, Ofrecer ayuda con ubicación, Elegir quién te ayuda, Tablero de Ayuda Humanitaria, Economía Solidaria, SOS recibido por red vecinal). Respeta su paleta, tipografía, tamaños y layout.
- Tokens de diseño (`src/theme/tokens.ts`): verde Ayni `#1F6F5C` (acción principal), ocre `#E8A33D` (Publicar y destacados), rojo emergencia `#B42318`, verde "estoy bien" `#1E6B45`, naranja vulnerable `#F08A24`, fondo `#FBF8F3` (emergencia `#FFF7F5`), tinta `#1C1B19`, texto secundario `#5C574F`, bordes `#E4DED2`. Tipografía **Atkinson Hyperlegible** (400 y 700, vía `@expo-google-fonts/atkinson-hyperlegible`). Radios 14 a 20. Texto base 18, títulos 28 a 30.

---

## 1. El reto (texto oficial)

> Crear en 48 horas un aplicativo que sirva a los ciudadanos para obtener con costos mínimos, y sin necesidad de transporte mayor, productos y servicios avalados por recomendaciones de vecinos. La aplicación debe integrar mecanismos de intercambios solidarios y evolucionar en situaciones de emergencia para coordinar soporte a los vecinos.

**Función principal (según el expositor, Mario Cortijo, editor de proyectos periodísticos de El Comercio):** obtener información recomendada sobre productos y servicios que se ofrecen cerca de la zona de residencia.

### Requisitos funcionales obligatorios (checklist del jurado)

1. Coordinación de necesidades de ayuda y recursos entre vecinos en emergencias.
2. Geolocalización de servicios, recursos y necesidades de apoyo.
3. Tutorial para usar la aplicación.
4. Enfoque móvil, con **máximo tres clics para publicar**.
5. Funcionalidad **online y offline**.
6. Uso intuitivo y accesible para **cualquier vecino**, sin importar su destreza tecnológica.
7. Facilidad para promover servicios y compartir recomendaciones vecinales.
8. Facilidad para solicitar y ofrecer ayuda e intercambios solidarios.
9. Identificación de servicios y grupos de apoyo disponibles durante emergencias.

### Criterios de evaluación

Usabilidad (sin fricción) · Confiabilidad (estable, cumple el objetivo) · Escalabilidad (preparado para crecer) · Código completo (interfaz + funcionalidad real) · Innovación y creatividad.

### Reglas de las bases que afectan al código

- Todo código o componente de terceros debe **declararse explícitamente** al comité → mantener `TERCEROS.md` actualizado con cada dependencia relevante (nombre, versión, licencia, uso).
- La propiedad intelectual se cede a UTP y El Comercio → no reutilizar código privado de otros proyectos.
- No violar privacidad de terceros → datos semilla 100 % ficticios.

---

## 2. Concepto del producto

Una sola app con **2 módulos** que **evolucionan** entre **2 modos**. Usa en la interfaz **exactamente** los nombres que usó el organizador (el jurado los busca):

| | **Modo Día a día** | **Modo Emergencia** |
|---|---|---|
| **Módulo 1 · Servicios de Proximidad** (economía local) | Directorio de oficios, profesiones **y productos** del barrio (gasfitería, carpintería, electricidad, cerrajería, paseo de mascotas, clases, comida casera como lasañas o pastelitos), validados con el **"Visto Bueno Vecinal"** | **Directorio de apoyo**: servicios y grupos disponibles ante emergencias (enfermera, electricista, quien tiene generador, camioneta, etc.) |
| **Módulo 2 · Cadena de Favores** (red de solidaridad, economía solidaria) | **Muro comunitario sin dinero**: préstamo de herramientas y objetos (muletas, taladro), ayuda temporal, donación de materiales, intercambio de habilidades, **movilidad solidaria** (llevar niños al mismo colegio) | **Tablero de Ayuda Humanitaria** (reportes geolocalizados de vecinos en situación vulnerable, SOS, "Estoy bien") + sección **Economía Solidaria** (coordinar y compartir recursos críticos: agua, baldes, medicinas, refugio) |

### Diferenciadores (lo que nos hace ganar)

1. **Mesh entre celulares sin internet ni hardware**: en emergencia, los mensajes SOS viajan de celular en celular por Bluetooth y Wi-Fi Direct (Google Nearby Connections). Cada celular es un "cartero" con guardar y reenviar. Cuando cualquiera recupera internet, sube todo a la nube.
2. **Publicar por voz**: el vecino dice "vendo lasañas a 15 soles los sábados" y la app arma la publicación (tipo, categoría, título, precio). Pensado para adultos mayores.
3. **Visto Bueno Vecinal con mecanismo real**: solo puede dar visto bueno un vecino a menos de 1.5 km que confirma "ya usé este servicio". Se muestra "4 vecinos de tu zona le dieron visto bueno".
4. **Máximo 3 toques para publicar**, con contador visible (modo demo).
5. **"Sin transporte mayor" como métrica**: cada resultado muestra distancia y minutos caminando; filtro por defecto "a pie" (≤ 1.5 km).
6. **Aynis**: puntos de reciprocidad. Ayudar suma, pedir no resta (no queremos que alguien en necesidad se sienta en deuda). Es reputación solidaria, no moneda.
7. **Offline real**: todo se lee y se publica sin conexión; se sincroniza solo al volver la señal.

### Escalabilidad (solo para el pitch y la arquitectura, NO implementar)

- Fase 2: panel para municipalidades y juntas vecinales; activación oficial del Modo Emergencia; integración con alertas oficiales y reportes ciudadanos para medios (El Comercio).
- Fase 3: **Nodos Vecinales LoRa** (uno por cuadra, financiado por la municipalidad) que extienden el mesh a kilómetros. El vecino no compra nada.
- Deja la arquitectura preparada: el transporte de mensajes de emergencia debe ser una **interfaz** (`MeshTransport`) para que mañana se pueda agregar un transporte LoRa sin tocar la lógica.

---

## 3. Stack técnico (decidido, no cambiar sin avisar)

| Capa | Tecnología |
|---|---|
| App | **React Native + Expo (SDK más reciente estable) con Expo Router**, TypeScript. **Expo Dev Build**, NO Expo Go (hay módulos nativos) |
| Plataforma objetivo | **Android primero** (APK). iOS fuera del alcance del MVP |
| UI | NativeWind (Tailwind) o StyleSheet con tokens de diseño en `src/theme/` |
| Estado | Zustand |
| Base local offline | **expo-sqlite** (fuente de verdad local) |
| Backend | **Supabase**: Auth (anónima + nombre), Postgres + **PostGIS**, Realtime, Storage, Edge Functions |
| Mapa | **@maplibre/maplibre-react-native** con estilo de **OpenFreeMap** (`https://tiles.openfreemap.org/styles/liberty`, sin API key) y **paquete offline** del barrio demo. Verifica los términos de uso de los tiles para descarga offline |
| Ubicación | expo-location |
| Mesh P2P | **expo-nearby-connections** (Android: Google Nearby Connections; iOS: Multipeer) |
| Voz | **expo-speech-recognition** (reconocimiento en el dispositivo) + parser con LLM vía Supabase Edge Function cuando hay internet; parser por palabras clave cuando no hay |
| Texto a voz | expo-speech (leer en voz alta títulos y avisos, accesibilidad) |
| Conectividad | @react-native-community/netinfo |
| IDs | UUID generados en el cliente (para crear offline) |
| Builds | **EAS Build** perfil `preview` → APK. **expo-updates** instalado desde el primer build para OTA con `eas update` |
| Landing | HTML estático en `/landing`, desplegado en **Vercel**, con QR a la descarga del APK |

---

## 4. Arquitectura

```
src/
  app/                      # Expo Router
    (onboarding)/tutorial.tsx
    (tabs)/index.tsx        # Cerca de ti (Módulo 1) mapa + lista
    (tabs)/favores.tsx      # Cadena de Favores (Módulo 2)
    (tabs)/publicar.tsx     # flujo de 3 toques (modal)
    (tabs)/perfil.tsx
    emergencia/index.tsx    # Tablero de Ayuda Humanitaria
    emergencia/economia.tsx # Economía Solidaria
    emergencia/apoyo.tsx    # Directorio de apoyo
    listing/[id].tsx        # detalle + Visto Bueno
    favor/[id].tsx
  components/               # BigButton, MapView, ListingCard, ClickCounter, OfflineBanner, SOSButton...
  features/
    listings/  favors/  emergency/  vistobueno/  aynis/  voice/  tutorial/
  data/
    db.ts                   # expo-sqlite, migraciones locales
    repositories/           # toda lectura/escritura pasa por aquí (local primero)
    sync/                   # SyncEngine: outbox → Supabase, pull incremental, realtime
  mesh/
    MeshTransport.ts        # interfaz
    NearbyTransport.ts      # implementación expo-nearby-connections
    MeshRouter.ts           # dedupe, TTL, guardar y reenviar
  lib/  supabase.ts  geo.ts  ids.ts  connectivity.ts
  theme/  tokens.ts
  seed/   seed.json         # datos demo
supabase/
  migrations/  functions/parse-voice/  seed.sql
landing/  index.html
TERCEROS.md  README.md
```

### Principio offline-first

1. **Toda** escritura va primero a SQLite + una fila en la tabla local `outbox`.
2. La UI **solo lee de SQLite** (nunca espera a la red).
3. `SyncEngine` corre al iniciar, al recuperar conexión (NetInfo) y cada 30 s online:
   - **Push**: envía `outbox` en orden con `upsert` (idempotente por `id`).
   - **Pull**: trae filas con `updated_at > last_pulled_at` por tabla.
   - **Realtime**: suscripción a `emergency_reports` y `zones` para el modo emergencia.
4. Conflictos: **last write wins** por `updated_at`. Los reportes de emergencia nunca se pisan: solo cambia `status`.
5. Banner visible: "Sin conexión · 3 publicaciones esperando enviarse" / "Sincronizado hace 1 min".
6. Al primer inicio con internet, descargar los datos de la zona (radio 3 km) y el paquete de mapa offline.

---

## 5. Modelo de datos (Supabase, con PostGIS)

Crea una migración con esto (ajusta lo necesario, pero mantén nombres):

```sql
create extension if not exists postgis;

create table zones (
  id uuid primary key,
  name text not null,                 -- "Lince - Sector 3"
  district text not null,
  center geography(point) not null,
  radius_m int not null default 1500,
  emergency_active boolean not null default false,
  emergency_type text,                -- 'sismo' | 'inundacion' | 'incendio' | 'otro'
  emergency_started_at timestamptz,
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  phone_whatsapp text,
  zone_id uuid references zones(id),
  home geography(point),
  is_zone_admin boolean not null default false,   -- junta vecinal
  is_vulnerable boolean not null default false,   -- adulto mayor, discapacidad (opt-in)
  aynis int not null default 0,
  easy_mode boolean not null default false,       -- letra extra grande
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MÓDULO 1: Servicios de Proximidad
create table listings (
  id uuid primary key,
  owner_id uuid references profiles(id),
  zone_id uuid references zones(id),
  kind text not null check (kind in ('servicio','producto')),
  category text not null,          -- gasfiteria, carpinteria, electricidad, cerrajeria, mascotas, clases, comida, salud, transporte, otros
  title text not null,
  description text,
  price_hint text,                 -- "S/ 15", "a convenir", "gratis"
  schedule text,                   -- "sábados 10am-2pm"
  location geography(point) not null,
  whatsapp text,
  available_in_emergency boolean not null default false,
  emergency_capability text,       -- "tengo generador", "primeros auxilios"
  visto_bueno_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vistos_buenos (
  id uuid primary key,
  listing_id uuid references listings(id) on delete cascade,
  voter_id uuid references profiles(id),
  comment text,
  distance_m int not null,         -- distancia voter.home ↔ listing.location al votar
  created_at timestamptz not null default now(),
  unique (listing_id, voter_id)
);

-- MÓDULO 2: Cadena de Favores
create table favors (
  id uuid primary key,
  author_id uuid references profiles(id),
  zone_id uuid references zones(id),
  type text not null check (type in ('pido','ofrezco','presto','dono','intercambio','movilidad')),
  category text not null,          -- herramientas, salud, materiales, habilidades, cuidado, movilidad, otros
  title text not null,
  description text,
  location geography(point) not null,
  status text not null default 'abierto' check (status in ('abierto','en_curso','resuelto')),
  -- solo movilidad solidaria:
  mobility_destination text,       -- "Colegio San Antonio"
  mobility_days text[],            -- {'lun','mar','mie','jue','vie'}
  mobility_time text,              -- "07:15"
  mobility_role text,              -- 'llevo' | 'recojo' | 'busco'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table favor_responses (       -- "ofertas" de ayuda a un favor
  id uuid primary key,
  favor_id uuid references favors(id) on delete cascade,
  responder_id uuid references profiles(id),
  responder_name text,
  message text,                       -- "Lo tengo, pasa cuando quieras"
  location geography(point) not null, -- desde dónde ayuda
  location_source text not null default 'gps' check (location_source in ('gps','mapa')),
  location_label text,                -- "Jr. Ica 250" (dirección aproximada)
  distance_m int not null,            -- distancia al punto del favor, calculada al crear
  status text not null default 'propuesto'
    check (status in ('propuesto','aceptado','agradecido','completado','retirado')),
  thanks_message text,                -- mensaje automático para las ofertas no elegidas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (favor_id, responder_id)
);
-- en favors: agregar   accepted_response_id uuid references favor_responses(id)

-- MODO EMERGENCIA: Tablero de Ayuda Humanitaria + Economía Solidaria
create table emergency_reports (
  id uuid primary key,             -- el MISMO id viaja por el mesh (idempotencia)
  author_id uuid references profiles(id),
  author_name text,
  zone_id uuid references zones(id),
  kind text not null check (kind in ('sos','estoy_bien','vulnerable','recurso_necesito','recurso_ofrezco')),
  need text,                       -- agua, baldes, medicinas, refugio, rescate, comida, abrigo, energia
  description text,
  people_count int default 1,
  priority int not null default 2, -- 1 alta, 2 media, 3 baja (sos=1)
  location geography(point) not null,
  status text not null default 'abierto' check (status in ('abierto','atendiendo','resuelto')),
  origin text not null default 'online' check (origin in ('online','mesh','sms')),
  mesh_hops int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aynis (reputación solidaria)
create table ayni_ledger (
  id uuid primary key,
  user_id uuid references profiles(id),
  delta int not null,
  reason text not null,            -- 'favor_completado','visto_bueno_recibido','presto','respondio_emergencia'
  ref_id uuid,
  created_at timestamptz not null default now()
);
```

Además:
- Índices GIST en todas las columnas `geography`.
- RPC `nearby_listings(lat, lng, radius_m, category)` y `nearby_favors(...)` ordenados por distancia, que devuelvan `distance_m`.
- Trigger que actualiza `listings.visto_bueno_count` y suma Aynis al dueño.
- Trigger `updated_at`.
- **RLS activado en todas las tablas**: lectura para usuarios autenticados de su zona; escritura solo sobre filas propias; `zones.emergency_active` solo editable por `is_zone_admin`.
- Realtime habilitado en `emergency_reports` y `zones`.
- Auth: **Supabase anonymous sign-in** + pedir solo nombre y (opcional) WhatsApp. Nada de OTP en el MVP.

Replica estas tablas en SQLite (geografía como `lat`/`lng` REAL) más `outbox(id, table, op, payload, created_at, attempts)`, `sync_state(table, last_pulled_at)` y `mesh_seen(id, seen_at)`.

---

## 6. Funcionalidades en detalle

### 6.1 Tutorial (requisito obligatorio)
- 3 pantallas al primer ingreso, con ilustración, una frase grande y botón "Siguiente": (1) Encuentra lo que necesitas cerca de casa. (2) Ayuda y pide ayuda sin dinero. (3) En una emergencia, tu barrio sigue conectado aunque no haya internet.
- Luego **coach marks** sobre los botones reales (Publicar, SOS, filtro "a pie").
- Botón "Escuchar" que lee el texto en voz alta (expo-speech).
- Se puede repetir desde Perfil → "Ver tutorial".

### 6.2 Cerca de ti (Módulo 1)
- Toggle **Mapa / Lista**. Pines por categoría con ícono + color.
- Filtros en chips grandes: categorías + "A pie (≤ 1.5 km)" activo por defecto.
- Tarjeta: foto/ícono, título, precio, **"a 3 cuadras · 4 min caminando"**, badge **"Visto Bueno Vecinal · 5"**.
- Detalle: descripción, horario, mapa pequeño, botón **WhatsApp** (abre `wa.me` con mensaje prellenado), botón **"Dar Visto Bueno"**.
- Dar Visto Bueno: solo si `distance(voter.home, listing) ≤ 1500 m`, no es su propia publicación y marca "Ya usé este servicio". Comentario opcional (o por voz).
- Una cuadra urbana en Lima ≈ 100 m; caminata ≈ 80 m/min. Pon esto en `geo.ts`.
- `formatDistance(m)`: menos de 1000 m → "120 m"; desde 1000 m → "1.2 km". Siempre acompañado de minutos a pie ("120 m · 2 min a pie"). Usa la misma función en toda la app (servicios, favores, ofertas y emergencia).

### 6.3 Publicar en 3 toques (crítico)
- Botón flotante central grande **"Publicar"** (toque 1).
- Pantalla con 6 tiles enormes con ícono + texto (toque 2): **Ofrezco un servicio · Vendo un producto · Pido ayuda · Presto / Dono · Movilidad solidaria · Emergencia**.
- Pantalla de confirmación con todo **prellenado** (toque 3 = "Publicar"):
  - Ubicación actual automática.
  - Título y categoría sugeridos.
  - Botón grande de micrófono: "Dilo con tu voz".
  - Campos editables, pero opcionales.
- Componente `ClickCounter` (activable en Perfil → "Modo demo") que muestra "Toques: 1/3, 2/3, 3/3 ✓".

### 6.4 Publicar por voz
- `expo-speech-recognition` con `lang: 'es-PE'` (fallback `es-ES`), preferir reconocimiento en el dispositivo.
- **Online**: Edge Function `parse-voice` recibe el texto y devuelve JSON `{module, kind|type, category, title, description, price_hint, schedule, need}` usando un LLM (la API key vive solo en los secrets de Supabase, nunca en la app). Incluye few-shot con ejemplos peruanos ("gasfitero", "chamba", "a 15 soles").
  - **Proveedor intercambiable** con el secret `LLM_PROVIDER=gemini|claude`. Por defecto **Gemini** (free tier de Google AI Studio, secret `GEMINI_API_KEY`, modelo Flash-Lite o Flash, salida JSON con `responseMimeType: "application/json"`). Alternativa **Claude** (secret `ANTHROPIC_API_KEY`, modelo Haiku, JSON validado). Misma interfaz `parseWithLLM(text): Promise<ParsedPost>` para ambos.
  - Timeout de 4 s: si el LLM falla, tarda o se agota la cuota, usar `parseVoiceOffline` sin mostrar error al vecino.
  - Declarar el proveedor usado en `TERCEROS.md`.
- **Offline**: `parseVoiceOffline(text)` con diccionario de palabras clave → categoría y tipo (vendo/ofrezco/necesito/presto/me prestan/llevo al colegio/socorro/ayuda/agua/baldes).
- Siempre mostrar el resultado para confirmar antes de publicar (sigue siendo el toque 3).

### 6.5 Cadena de Favores (Módulo 2)
- Muro tipo feed con filtros: Todo · Pido · Ofrezco · Presto · Dono · Intercambio · Movilidad.
- Tarjeta con distancia, tiempo transcurrido, contador "3 vecinos ofrecen ayuda" y botón grande **"Yo te ayudo"**.

**Ofrecer ayuda** (pantalla `OfrecerAyuda` del diseño), en 2 toques:
1. "Yo te ayudo" abre la pantalla con la **ubicación actual detectada por GPS** ya seleccionada (dirección aproximada + precisión).
2. Opción **"Elegir en el mapa"**: mapa con pin fijo al centro; el vecino mueve el mapa para ubicar el punto (útil si el martillo está en casa y él está en otro lado). Guarda `location_source = 'mapa'`.
3. Mensaje prellenado editable ("Lo tengo, pasa cuando quieras") con micrófono.
4. Muestra en vivo "Estarás a 300 m · 4 min a pie de quien pide".
5. **"Enviar oferta"** → crea `favor_response` (offline primero, sale por la outbox).
- **Privacidad:** antes de ser aceptado, quien pide ve la ubicación del que ofrece **redondeada a unos 50 m**. La ubicación exacta y el WhatsApp se comparten solo con la oferta aceptada.

**Elegir quién te ayuda** (pantalla `OfertasFavor` del diseño):
- Quien pidió recibe una notificación local por cada oferta.
- Lista de ofertas **ordenadas por distancia**, con etiqueta "Más cerca" en la primera. Cada oferta muestra: nombre, distancia, minutos a pie, Visto Bueno / Aynis del vecino, su mensaje y botón **"Elegir"**.
- Mini mapa con tu pin y los pines numerados de cada oferta.
- Al tocar "Elegir" (1 toque + confirmación):
  - Esa oferta pasa a `aceptado`, el favor a `en_curso` y se guarda `accepted_response_id`.
  - **Las demás pasan a `agradecido`** y reciben automáticamente: "¡Gracias, vecino! Esta vez ya me ayudaron, pero tu intención cuenta." Cada una suma **+1 Ayni** (ofrecer ayuda también se reconoce).
  - Se abre WhatsApp con el elegido, con mensaje prellenado.
- Al terminar, **"Ya me ayudaron"** pasa el favor a `resuelto` y la oferta a `completado` (+5 Aynis al que ayudó) y ofrece darle Visto Bueno.
- Quien ofreció puede **retirar** su oferta mientras esté `propuesto`.

Estados del favor: abierto → en curso → resuelto.
- **Movilidad solidaria**: formulario corto (destino, días, hora, "llevo / recojo / busco"). Mostrar coincidencias: "Carla también va al Colegio San Antonio a las 7:15".

### 6.6 Modo Emergencia (la app "evoluciona")
- Se activa de dos formas: (a) un admin de zona (junta vecinal) activa `zones.emergency_active` → llega por Realtime y **también por mesh** (mensaje `EMERGENCY_ON`); (b) botón **SOS** siempre visible en el header, que abre el modo localmente.
- Cuando está activo, **toda la app cambia**: header rojo, barra de estado "EMERGENCIA · Sismo · activa hace 12 min", y la navegación cambia a 3 pestañas:
  1. **Tablero de Ayuda Humanitaria**: mapa con reportes por prioridad (SOS rojo, vulnerable naranja, necesita recurso amarillo, estoy bien verde). Lista ordenada por prioridad y distancia. Botones gigantes **"Estoy bien"** y **"Necesito ayuda"**. Los vecinos con `is_vulnerable` aparecen marcados para que los vecinos cercanos vayan a verlos.
  2. **Economía Solidaria**: necesito / ofrezco recursos críticos (agua, baldes, medicinas, refugio, energía, comida, abrigo) con contador "3 vecinos ofrecen agua cerca".
  3. **Directorio de apoyo**: listings con `available_in_emergency = true` + capacidades (enfermera, electricista, generador, camioneta).
- "Estoy bien" y "SOS" se publican en **1 toque** + confirmación.
- Cada reporte muestra su origen: "vía internet" o **"vía red vecinal · 2 saltos"**.

### 6.7 Mesh vecinal (diferenciador principal)
- Interfaz:
  ```ts
  interface MeshTransport {
    start(selfId: string, name: string): Promise<void>;
    stop(): Promise<void>;
    broadcast(msg: MeshMessage): Promise<void>;
    onMessage(cb: (msg: MeshMessage, fromPeer: string) => void): () => void;
    onPeersChanged(cb: (peers: Peer[]) => void): () => void;
  }
  ```
- `NearbyTransport` con expo-nearby-connections: anunciar + descubrir en paralelo, conexión automática a los peers encontrados (sin pedir confirmación al usuario en modo emergencia), reconexión.
- Formato compacto (JSON corto):
  ```ts
  type MeshMessage = {
    v: 1; id: string; ttl: number; h: number;      // hops
    t: 'SOS' | 'OK' | 'VUL' | 'NEED' | 'OFFER' | 'EMERGENCY_ON' | 'EMERGENCY_OFF';
    a: string; n: string;                          // author id, nombre
    la: number; lo: number;
    nd?: string; m?: string; pc?: number;          // need, mensaje, personas
    ts: number;
  }
  ```
- `MeshRouter`:
  - Al recibir: si `id` está en `mesh_seen` → descartar. Si no → guardar en SQLite como `emergency_report` con `origin='mesh'`, `mesh_hops=h+1`, mostrar notificación local y reenviar a todos los peers excepto el emisor con `ttl-1` (si `ttl > 0`). TTL inicial: 6.
  - **Guardar y reenviar**: mantener cola de mensajes de las últimas 6 h; cuando aparece un peer nuevo, enviarle todos los mensajes vigentes.
  - Cualquier dispositivo con internet sube los reportes `origin='mesh'` con `upsert` por `id` (idempotente: no se duplican aunque lleguen por varios caminos).
- El mesh se activa automáticamente en Modo Emergencia o cuando no hay internet; también hay un switch manual "Red vecinal" en Perfil.
- Pantalla de diagnóstico en Perfil (modo demo): peers conectados, mensajes vistos, mensajes reenviados.
- Plan B en el botón SOS: si no hay peers ni internet, ofrecer **"Enviar por SMS"** que abre la app de SMS con texto y link de Google Maps prellenados.

### 6.8 Perfil
- Nombre, Aynis, mis publicaciones, mis favores.
- Toggles: "Modo fácil" (letra extra grande), "Soy persona vulnerable" (opt-in), "Red vecinal", "Modo demo".
- Solo admin de zona: botón "Activar Modo Emergencia" con selector de tipo.
- "Ver tutorial".

---

## 7. Accesibilidad (criterio de evaluación explícito)

- Texto base **18 sp**; "Modo fácil" lo sube a 22 sp.
- Áreas táctiles **mínimo 56 dp**. Botones principales a lo ancho.
- Siempre **ícono + texto**, nunca solo ícono.
- Contraste AA como mínimo.
- `accessibilityLabel` y `accessibilityHint` en todos los controles (TalkBack).
- Lenguaje simple y peruano: "Pide una mano", "Yo te ayudo", "Estoy bien". Nada de jerga técnica.
- Feedback háptico en acciones importantes.
- Nada de gestos ocultos (sin swipe obligatorio).

---

## 8. Datos semilla (demo)

Barrio demo: **Lince, Lima** (centro aprox. `-12.0846, -77.0353`). Todos los datos ficticios. Usa los ejemplos que dio el organizador en la inauguración, el jurado los va a reconocer:

- **Personas**: Rosa Quispe (vende lasañas y pastelitos), Don Pedro Huamán (78 años, se lesionó, necesita muletas, marcado vulnerable), Carla Mendoza (madre, lleva a su hija al Colegio San Antonio 7:15), Luis Torres (gasfitero), Miguel Rojas (cerrajero), Ana Flores (enfermera, disponible en emergencia), Jorge Salazar (tiene generador), Prof. Lucía Ramos (clases de matemática), Sofía Paredes (paseadora de mascotas), Junta Vecinal Lince Sector 3 (admin).
- **Listings**: 15 a 20 entre servicios y productos, distribuidos dentro de 1.5 km, con 0 a 7 vistos buenos cada uno.
- **Favors**: muletas (Don Pedro pide), taladro (presto), donación de ropa, intercambio "te enseño Excel, me enseñas a cocinar", 2 de movilidad al Colegio San Antonio que coinciden.
- **Emergencia (se carga al activar el modo en la demo)**: casa inundada que necesita baldes, adulto mayor solo, 3 "estoy bien", ofrecimiento de agua y de generador.
- Script `npm run seed` que carga `seed.sql` en Supabase y `seed.json` en SQLite para el modo sin conexión.

---

## 9. Entregables (subir a OneDrive antes del domingo 7:00 p. m.; meta: 5:00 p. m.)

1. **Repositorio público en GitHub** con README completo.
2. **ZIP del código.**
3. **APK** generado con EAS (`eas.json` con perfil `preview`, `distribution: internal`, `android.buildType: apk`), publicado también en **GitHub Releases**.
4. **Landing en Vercel** (`/landing/index.html`): nombre, frase, botón "Descargar para Android" (link a GitHub Releases), **QR** que apunta a la propia landing, 3 pasos con imágenes para permitir "instalar apps de fuentes desconocidas", video de la demo.
5. `TERCEROS.md`: todas las dependencias y servicios externos (Expo, Supabase, MapLibre, OpenFreeMap/OpenStreetMap, expo-nearby-connections, expo-speech-recognition, proveedor del LLM, etc.) con licencia y uso.
6. `README.md`: qué es, cómo se usa, arquitectura (diagrama), cómo correr local, cómo hacer build, variables de entorno, decisiones offline/mesh, roadmap (municipalidades, LoRa).
7. Presentación (la arma el equipo; tú genera el diagrama de arquitectura en Mermaid dentro del README).

---

## 10. Calidad mínima antes de cada commit a main

- `npx tsc --noEmit` sin errores.
- La app abre en Android sin pantalla roja.
- Probar el flujo de la fase en **modo avión** además de online.
- Sin `console.log` de datos sensibles. Sin keys en el repo.

---

## 11. Guion de la demo (diseña pensando en esto)

Final: 5 min de presentación + **15 min de demo**. La app debe permitir este recorrido sin fallar:

1. Tutorial de 3 pantallas.
2. Rosa busca gasfitero → lo encuentra a 2 cuadras con 5 vistos buenos → WhatsApp → le da Visto Bueno.
3. Rosa publica por voz "vendo lasañas a 15 soles los sábados" en 3 toques (contador visible).
4. Don Pedro pide muletas → una vecina toca "Yo te ayudo". Carla publica movilidad al colegio y ve una coincidencia.
5. Modo avión → publicar → quitar modo avión → se sincroniza solo.
6. Admin activa Modo Emergencia (sismo) → la app cambia a rojo → tablero, economía solidaria, directorio de apoyo.
7. **Dos celulares en modo avión** (Bluetooth encendido): SOS "Necesito baldes" de A aparece en B "vía red vecinal". Si hay tercer celular, mostrar el salto A → B → C.
8. Uno recupera internet → el reporte sube y aparece en un tercer dispositivo online.

---

## 12. Fases (hora Perú)

| Fase | Cuándo | Entregable verificable |
|---|---|---|
| **F0 Base** | Sáb 2:00 a 4:00 a. m. | Proyecto Expo + Router + TS, tokens de diseño, Supabase con migraciones y RLS, SQLite con migraciones, auth anónima, **primer EAS dev build en cola**, `TERCEROS.md` iniciado |
| **F1 Módulo 1** | Sáb 8:00 a. m. a 1:00 p. m. | Mapa + lista con distancias, filtros, detalle, WhatsApp, Visto Bueno con regla de distancia, publicar en 3 toques (sin voz) |
| **F2 Módulo 2** | Sáb 1:00 a 6:00 p. m. | Muro de favores, "Yo te ayudo", estados, movilidad solidaria con coincidencias, Aynis |
| **F3 Offline + Emergencia** | Sáb 6:00 p. m. a 1:00 a. m. | Outbox + SyncEngine + banner, mapa offline del barrio, Modo Emergencia completo (3 pestañas), Realtime |
| **F4 Mesh + Voz + Tutorial** | Dom 8:00 a. m. a 1:00 p. m. | Mesh con dedupe/TTL/guardar y reenviar probado en 2 o 3 celulares, SMS fallback, voz online/offline, tutorial + coach marks, accesibilidad |
| **🔒 Congelar código** | **Dom 1:00 p. m.** | Solo bugs desde aquí |
| **F5 Entrega** | Dom 1:00 a 5:00 p. m. | Seed final, APK release en GitHub Releases, `eas update` configurado, landing en Vercel con QR, README + diagrama, ZIP |

---

## 13. Plan de corte (si vamos tarde, recortar en este orden)

1. Coach marks → dejar solo las 3 pantallas del tutorial.
2. LLM de voz → solo parser offline por palabras clave.
3. Aynis → mostrar contador simple sin ledger.
4. Coincidencias de movilidad → solo publicar y listar.
5. Realtime → pull cada 10 s en modo emergencia.

**Nunca recortar**: 3 toques, offline con sincronización, Modo Emergencia, Visto Bueno Vecinal, tutorial, geolocalización, mesh entre 2 celulares.

---

## 14. Primera tarea

Empieza por **F0**. Antes de escribir código, confírmame en 10 líneas: versión de Expo que usarás, librerías exactas con versión, y cualquier riesgo de compatibilidad entre `expo-nearby-connections`, `@maplibre/maplibre-react-native` y `expo-speech-recognition` con esa versión de Expo. Luego ejecuta F0 completa.
