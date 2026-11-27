/**
 * 지도 공통 인터페이스. 화면은 이 타입만 알고, 실제 지도 엔진은 환경별 구현이 맡는다.
 * - 앱(iOS·Android): components/MapView.tsx → react-native-maps (iOS는 Apple 지도, Android는 Google 지도)
 * - 웹: components/MapView.web.tsx → Leaflet + OpenStreetMap 타일
 * 이동 시간 숫자·동선 자동 최적화는 지도 제공자 조건·비용을 확인한 뒤 별도 단계에서 붙인다.
 */
export type MapPin = { id: string; order: number; lat: number; lng: number; label: string; color: string };
export type MapViewProps = {
  pins: MapPin[];
  onPinPress?: (id: string) => void;
  height?: number;
  /** 핀이 없을 때 보여 줄 중심 (기본: 오사카 난바) */
  emptyCenter?: { lat: number; lng: number };
};

export const DEFAULT_CENTER = { lat: 34.6687, lng: 135.5013 };
/** 동선 선 스타일 (앱·웹 공통) */
export const ROUTE_DASH = [6, 5];
