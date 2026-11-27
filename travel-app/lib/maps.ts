/**
 * 지도 공통 인터페이스. 화면은 이 타입만 알고, 실제 지도 엔진은 환경별 구현이 맡는다.
 * Phase 1: components/MapView.tsx 자리(placeholder)만 있다.
 * Phase 2: MapView.tsx(react-native-maps) / MapView.web.tsx(웹 지도 라이브러리)로 나눈다.
 */
export type MapPin = { id: string; order: number; lat: number; lng: number; label: string; color: string };
export type MapViewProps = { pins: MapPin[]; onPinPress?: (id: string) => void; height?: number };
