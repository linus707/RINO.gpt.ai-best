import { Text } from 'react-native';
import { color } from '@/constants/design';

/** Google 장소 정보를 보여 줄 때의 출처 표시 (Google 지도 없이 쓸 때 필요) */
export function GoogleAttribution() {
  return (
    <Text accessibilityLabel="장소 정보 출처 Google Maps" style={{ fontSize: 12, color: color.sub, fontFamily: undefined, marginTop: 4 }}>
      Google Maps
    </Text>
  );
}
