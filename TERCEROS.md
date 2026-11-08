# Componentes y servicios de terceros

Declaración exigida por las bases de la Hackathon UTP · El Comercio 2026. Se actualiza con cada dependencia que se agrega.
Versiones exactas instaladas (ver `package-lock.json`).

## Librerías de la app (npm)

| Componente | Versión | Licencia | Uso en Quadra |
|---|---|---|---|
| expo | 58.0.23 | MIT | SDK base de la app (Expo SDK 58) |
| react | 19.3.0 | MIT | Librería de interfaz |
| react-dom | 19.3.0 | MIT | Requerida por expo-router (solo web); fijada para evitar conflictos de versiones |
| react-native | 0.88.1 | MIT | Framework móvil nativo |
| expo-router | 58.0.30 | MIT | Navegación por archivos (pestañas, pilas, rutas) |
| expo-dev-client | 58.0.18 | MIT | Build de desarrollo con módulos nativos propios |
| expo-updates | 58.0.21 | MIT | Actualizaciones OTA con `eas update` |
| expo-sqlite | 58.0.15 | MIT | Base de datos local offline (fuente de verdad) y kv-store de sesión |
| expo-location | 58.0.20 | MIT | Ubicación GPS del vecino |
| expo-speech | 58.0.3 | MIT | Texto a voz (botón "Escuchar", accesibilidad) |
| expo-speech-recognition | 58.0.1 | MIT | Reconocimiento de voz para "Publicar por voz" |
| expo-nearby-connections | 1.1.1 | MIT | Red vecinal (mesh) por Bluetooth/Wi-Fi Direct con Google Nearby Connections |
| react-native-nitro-modules | 0.37.2 | MIT | Dependencia nativa requerida por expo-nearby-connections |
| @maplibre/maplibre-react-native | 11.5.1 | MIT | Mapa vectorial con soporte offline |
| @supabase/supabase-js | 2.119.0 | MIT | Cliente de Supabase (auth anónima, base de datos, realtime) |
| @react-native-community/netinfo | 12.0.1 | MIT | Detectar conexión para el banner y la sincronización |
| zustand | 5.1.0 | MIT | Estado global de la app |
| react-native-url-polyfill | 4.0.0 | MIT | Polyfill de `URL` requerido por supabase-js |
| expo-crypto | 58.0.7 | MIT | UUID generados en el celular (crear registros sin conexión) |
| expo-font | 58.0.11 | MIT | Carga de tipografías |
| @expo-google-fonts/atkinson-hyperlegible | 0.4.1 | MIT (código) + OFL-1.1 (fuente) | Tipografía Atkinson Hyperlegible (Braille Institute), diseñada para baja visión |
| @expo/vector-icons | 15.1.1 | MIT | Íconos (Ionicons) |
| expo-haptics | 58.0.7 | MIT | Vibración de confirmación en acciones importantes |
| expo-notifications | 58.1.8 | MIT | Notificaciones locales: nueva oferta de ayuda, SOS recibido por la red vecinal |
| expo-splash-screen | 58.0.13 | MIT | Pantalla de carga |
| expo-status-bar | 58.0.4 | MIT | Barra de estado |
| expo-system-ui | 58.0.7 | MIT | Color de fondo del sistema |
| expo-constants | 58.0.15 | MIT | Lectura de configuración de la app |
| expo-linking | 58.0.16 | MIT | Enlaces profundos y apertura de WhatsApp / SMS |
| react-native-safe-area-context | 5.11.1 | MIT | Márgenes seguros (notch, barra de navegación) |
| react-native-screens | 4.30.1 | MIT | Pantallas nativas para la navegación |
| typescript (dev) | 6.0.3 | Apache-2.0 | Tipado estático |
| patch-package (dev) | 8.0.1 | MIT | Aplica `patches/expo-nearby-connections+1.1.1.patch`: restaura `android/fix-prefab.gradle`, que falta en el paquete publicado (issue #14 del repo original). El contenido es el archivo original del autor (MIT) |
| @types/react (dev) | 19.3.0 | MIT | Tipos de React |

## Servicios externos

| Servicio | Licencia / términos | Uso en Quadra |
|---|---|---|
| Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) | Servicio en la nube, plan gratuito; código abierto Apache-2.0 | Backend: datos, sesión anónima, tiempo real |
| PostGIS | GPL-2.0 (extensión de Postgres en Supabase) | Consultas geográficas: distancias y "cerca de ti" |
| Expo Application Services (EAS Build / Update) | Servicio en la nube, plan gratuito | Compilar el APK y publicar actualizaciones |
| Google Nearby Connections (Google Play Services) | Términos de Google Play Services | Transporte Bluetooth / Wi-Fi Direct del mesh en Android |
| OpenFreeMap | Servicio gratuito sin API key; datos © OpenStreetMap (ODbL) | Estilo `liberty` y teselas vectoriales del mapa. Paquete offline pequeño solo del barrio demo (≈3 km, zoom 12–16, descarga única) |
| OpenStreetMap | ODbL 1.0 | Datos cartográficos (atribución visible en el mapa) |
| Google Gemini API (por defecto, `gemini-flash-lite-latest`, free tier de Google AI Studio) | Términos de Google AI Studio / Gemini API | Edge Function `parse-voice`: convierte el texto dictado en una publicación (JSON). La key vive solo en los secrets de Supabase |
| Anthropic Claude API (alternativo, `LLM_PROVIDER=claude`, modelo Haiku) | Términos comerciales de Anthropic | Mismo uso que Gemini, intercambiable por secret |
| Reconocimiento de voz de Google (Android) | Términos de Google | Servicio del sistema que usa expo-speech-recognition cuando no hay reconocimiento en el dispositivo |
| Vercel | Servicio en la nube, plan gratuito | Hosting de la landing (pendiente F5) |

## Landing (archivo vendido, no es dependencia npm)

| Componente | Versión | Licencia | Uso en Quadra |
|---|---|---|---|
| qrcode-generator (Kazuhiko Arase), copiado en `landing/qrcode.js` | 1.4.4 | MIT | Código QR de la landing, sin cargarlo desde un CDN |

## Plantilla de inicio

El proyecto se generó con `create-expo-app` (plantilla `blank-typescript`, © 650 Industries, MIT). Logo e íconos de Quadra: diseño propio del equipo PEAK (`assets/brand/`).
