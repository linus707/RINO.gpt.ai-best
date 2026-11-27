import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { color, radius } from '@/constants/design';
import type { MapViewProps } from '@/lib/maps';
import { AppText } from './AppText';

/**
 * 지도 자리 (Phase 1). 실제 지도 엔진 없이 핀 위치·순서만 그린다.
 * Phase 2에서 이 파일을 react-native-maps 구현으로, MapView.web.tsx를 웹 지도로 바꾼다.
 * 화면 코드는 그대로 둔다.
 */
export function MapView({ pins, onPinPress, height = 320 }: MapViewProps) {
  const lats = pins.map((p) => p.lat), lngs = pins.map((p) => p.lng);
  const cx = (Math.min(...lngs) + Math.max(...lngs)) / 2 || 0;
  const cy = (Math.min(...lats) + Math.max(...lats)) / 2 || 0;
  const span = Math.max(Math.max(...lngs) - Math.min(...lngs), (Math.max(...lats) - Math.min(...lats)) * 1.2, 0.004);
  const k = 140 / span;
  const pts = pins.map((p) => ({ ...p, x: 150 + (p.lng - cx) * k, y: 150 - (p.lat - cy) * k * 1.2 }));
  return (
    <View style={[s.box, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
        {[60, 120, 180, 240].map((v) => (
          <G key={v}><Line x1={v} y1={0} x2={v} y2={300} stroke={color.line} /><Line x1={0} y1={v} x2={300} y2={v} stroke={color.line} /></G>
        ))}
        <Path d="M-10 70 C60 90 120 60 170 100 S260 120 320 90" fill="none" stroke="#9cc8ee" strokeWidth={10} opacity={0.5} />
        {pts.length > 1 ? (
          <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color.action} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
        ) : null}
        {pts.map((p) => (
          <G key={p.id} onPress={() => onPinPress?.(p.id)}>
            <Circle cx={p.x} cy={p.y} r={13} fill={p.color} stroke="#fff" strokeWidth={2.5} />
            <SvgText x={p.x} y={p.y + 4.5} fill="#fff" fontSize={12} fontWeight="700" textAnchor="middle">{String(p.order)}</SvgText>
          </G>
        ))}
      </Svg>
      <View style={s.tag}><AppText v="caption" color={color.sub}>지도 자리 · Phase 2에서 실제 지도 연결</AppText></View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.surface },
  tag: { position: 'absolute', left: 8, top: 8, backgroundColor: color.bg, borderRadius: radius.sm, paddingHorizontal: 6 },
});
