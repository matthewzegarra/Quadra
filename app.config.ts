import type { ExpoConfig } from 'expo/config';

// Configuración de la app. Solo variables públicas (EXPO_PUBLIC_*) llegan al bundle.
// projectId de EAS (público, no es secreto). Se puede sobrescribir con EAS_PROJECT_ID.
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '24ec2069-39ec-4b45-a6bb-349470459fe0';

const config: ExpoConfig = {
  name: 'Quadra',
  slug: 'ayni',
  scheme: 'quadra',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#F8FAF5',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'pe.peak.ayni',
  },
  android: {
    package: 'pe.peak.ayni',
    adaptiveIcon: {
      backgroundColor: '#123023',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Los permisos de Bluetooth/Wi-Fi los agrega el plugin de expo-nearby-connections.
    permissions: ['RECORD_AUDIO', 'VIBRATE', 'POST_NOTIFICATIONS'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-sqlite',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 240, // logo + palabra "Quadra"
        backgroundColor: '#123023', // verde oscuro de la marca Quadra
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Quadra usa tu ubicación para mostrarte servicios y vecinos cerca de tu casa.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Quadra usa el micrófono para que publiques con tu voz.',
        speechRecognitionPermission: 'Quadra convierte tu voz en texto para armar tu publicación.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    [
      'expo-nearby-connections',
      {
        bluetoothUsagePermissionText:
          'Quadra usa Bluetooth para enviar mensajes de emergencia entre vecinos sin internet.',
        localNetworkUsagePermissionText:
          'Quadra usa la red local para conectar con celulares de vecinos cercanos.',
      },
    ],
    '@maplibre/maplibre-react-native',
    ['expo-notifications', { color: '#123023' }],
    'expo-updates',
  ],
  experiments: {
    typedRoutes: true,
  },
  runtimeVersion: { policy: 'appVersion' },
  owner: 'matthewzegarra',
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
};

export default config;
