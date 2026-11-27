import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import RNMapView, { Marker, Polyline } from 'react-native-maps';
import { color, radius } from '@/constants/design';
import { DEFAULT_CENTER, ROUTE_DASH, type MapViewProps } from '@/lib/maps';

/** 앱(iOS·Android) 지도 — 일정 순서대로 번호 핀과 점선 동선. 날짜가 바뀌면 그날 핀에 맞춰 화면을 맞춘다 */
export function MapView({ pins, onPinPress, height = 320, emptyCenter = DEFAULT_CENTER }: MapViewProps) {
  const ref = useRef<RNMapView>(null);
  const coords = pins.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const route = pins.filter((p) => !p.badge).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const fitKey = pins.map((p) => p.id).join(',');

  const fit = () => {
    if (coords.length > 1) {
      ref.current?.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    } else {
      const c = coords[0] ?? { latitude: emptyCenter.lat, longitude: emptyCenter.lng };
      ref.current?.animateToRegion({ ...c, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 300);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [fitKey]);

  return (
    <View style={[s.box, { height }]}>
      <RNMapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        onMapReady={fit}
        initialRegion={{ latitude: coords[0]?.latitude ?? emptyCenter.lat, longitude: coords[0]?.longitude ?? emptyCenter.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        toolbarEnabled={false}
      >
        {route.length > 1 ? <Polyline coordinates={route} strokeColor={color.action} strokeWidth={3} lineDashPattern={ROUTE_DASH} /> : null}
        {pins.map((p) => (
          <Marker
            key={`${p.id}-${p.order}-${p.color}`}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            onPress={() => onPinPress?.(p.id)}
            accessibilityLabel={p.badge ? `${p.badge} ${p.label}` : `${p.order}번 ${p.label}`}
            tracksViewChanges={false}
          >
            <View style={[s.pin, { backgroundColor: p.color }, p.badge ? s.badgePin : null]}>
              <Text style={s.pinText}>{p.badge ?? p.order}</Text>
            </View>
          </Marker>
        ))}
      </RNMapView>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.surface },
  pin: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: color.white, alignItems: 'center', justifyContent: 'center' },
  badgePin: { borderRadius: 6 },
  pinText: { color: color.white, fontSize: 12, fontWeight: '700' },
});
