import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** 앱 고유 일러스트: 산호색 입체 여행 가방 (D안 시그니처) */
export function Suitcase({ width = 120, height = 138 }: { width?: number; height?: number }) {
  const ribs = [48, 66, 84, 102];
  return (
    <Svg width={width} height={height} viewBox="0 0 160 184" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="sf" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE0CC" /><Stop offset="0.45" stopColor="#FFA987" /><Stop offset="1" stopColor="#EC6656" />
        </LinearGradient>
        <LinearGradient id="ss" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#DE574B" /><Stop offset="1" stopColor="#A3313A" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="84" cy="172" rx="58" ry="8" fill="#7a1d2b" opacity={0.3} />
      <G rotation={11} origin="84, 96">
        <Path d="M62 44V22q0-9 9-9h26q9 0 9 9v22" fill="none" stroke="#a23d3e" strokeWidth={7} />
        <Rect x="44" y="42" width="96" height="120" rx="18" fill="url(#ss)" />
        <Rect x="34" y="40" width="94" height="120" rx="18" fill="url(#sf)" />
        {ribs.map((x) => (
          <G key={x}>
            <Rect x={x} y="56" width="11" height="90" rx="5.5" fill="#f08b71" opacity={0.75} />
            <Path d={`M${x + 8} 60v82`} stroke="#ffe3c6" strokeWidth={1.4} />
          </G>
        ))}
        <Path d="M42 58q0-10 10-11h60" fill="none" stroke="#fff3df" strokeWidth={3} strokeLinecap="round" />
        <Rect x="58" y="36" width="34" height="8" rx="4" fill="#c84c43" />
        <Circle cx="50" cy="166" r="8" fill="#7f2834" />
        <Circle cx="118" cy="166" r="8" fill="#7f2834" />
        <Path d="m112 70 14-2 3 22-14 3Z" fill="#fff0d7" />
      </G>
    </Svg>
  );
}
