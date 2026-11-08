import { Ionicons } from '@expo/vector-icons';
import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import type { LatLng } from '@/lib/geo';
import { colors, radius } from '@/theme/tokens';

// Mapa vectorial MapLibre con estilo de OpenFreeMap (sin API key, datos © OpenStreetMap).
// Las teselas del barrio demo se guardan para uso offline (src/features/map/offlineMap.ts).

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  text?: string; // número o "SOS" o iniciales
  shape?: 'circle' | 'diamond' | 'square' | 'zone';
  pulse?: boolean;
  onPress?: () => void;
  label?: string;
};

type Props = {
  center: LatLng;
  zoom?: number;
  pins?: MapPin[];
  user?: LatLng | null;
  style?: ViewStyle;
  interactive?: boolean;
  /** Muestra un pin fijo en el centro y reporta el centro al mover el mapa. */
  pickMode?: boolean;
  onCenterChange?: (p: LatLng) => void;
  accessibilityLabel?: string;
};

export function QuadraMap({
  center,
  zoom = 15,
  pins = [],
  user,
  style,
  interactive = true,
  pickMode,
  onCenterChange,
  accessibilityLabel = 'Mapa del barrio',
}: Props) {
  const camera = useRef<CameraRef>(null);

  useEffect(() => {
    if (!pickMode) camera.current?.easeTo({ center: [center.lng, center.lat], duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return (
    <View style={[styles.wrap, style]} accessibilityLabel={accessibilityLabel}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        logo={false}
        attribution
        compass={false}
        dragPan={interactive}
        touchZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        onRegionDidChange={(e) => {
          if (!pickMode || !onCenterChange) return;
          const [lng, lat] = e.nativeEvent.center;
          onCenterChange({ lat, lng });
        }}
      >
        <Camera ref={camera} initialViewState={{ center: [center.lng, center.lat], zoom }} />
        {user ? (
          <Marker id="__user" lngLat={[user.lng, user.lat]}>
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Marker>
        ) : null}
        {pins.map((p) => (
          <Marker key={p.id} id={p.id} lngLat={[p.lng, p.lat]} onPress={p.onPress}>
            <PinView pin={p} />
          </Marker>
        ))}
      </Map>
      {pickMode ? (
        <View pointerEvents="none" style={styles.centerPin}>
          <Ionicons name="location" size={48} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

function PinView({ pin }: { pin: MapPin }) {
  if (pin.shape === 'zone') {
    return (
      <View accessibilityLabel={pin.label} style={[styles.zone, { backgroundColor: pin.color + '33', borderColor: pin.color }]}>
        <View style={[styles.zoneDot, { backgroundColor: pin.color }]}>
          {pin.text ? (
            <AppText bold variant="caption" color={colors.white}>
              {pin.text}
            </AppText>
          ) : pin.icon ? (
            <Ionicons name={pin.icon} size={14} color={colors.white} />
          ) : null}
        </View>
      </View>
    );
  }
  const size = pin.text === 'SOS' ? 52 : 40;
  const shapeStyle: ViewStyle =
    pin.shape === 'diamond'
      ? { borderRadius: 6, transform: [{ rotate: '45deg' }] }
      : pin.shape === 'square'
        ? { borderRadius: 8, borderColor: colors.ink }
        : { borderRadius: size / 2 };
  return (
    <View accessibilityLabel={pin.label} style={pin.pulse ? [styles.pulse, { borderRadius: (size + 16) / 2 }] : undefined}>
      <View style={[styles.pin, { width: size, height: size, backgroundColor: pin.color }, shapeStyle]}>
        <View style={pin.shape === 'diamond' ? { transform: [{ rotate: '-45deg' }] } : undefined}>
          {pin.text ? (
            <AppText bold variant="small" color={pin.shape === 'square' ? colors.ink : colors.white}>
              {pin.text}
            </AppText>
          ) : pin.icon ? (
            <Ionicons name={pin.icon} size={20} color={pin.shape === 'square' ? colors.ink : colors.white} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  zone: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  pulse: { padding: 8, backgroundColor: 'rgba(180,35,24,0.25)' },
  userHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.userDot,
    borderWidth: 3,
    borderColor: colors.white,
  },
  centerPin: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 44, // la punta del pin queda en el centro
  },
});
