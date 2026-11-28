import { router } from 'expo-router';
import { View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import type { GuidebookStop } from '@/features/guidebooks/data';
import { placeById } from '@/features/places/data';
import { ourToResolved } from '@/features/places/hooks';
import { AppText } from './AppText';
import { PlaceRow } from './Cards';

/** 가이드북 코스의 한 장소 + 리노의 팁 */
export function StopRow({ stop, order }: { stop: GuidebookStop; order: number }) {
  const p = placeById(stop.placeId);
  if (!p) return null;
  return (
    <View style={{ marginBottom: space.sm }}>
      <PlaceRow place={ourToResolved(p)} order={order} onPress={() => router.push(`/place/${p.id}`)} />
      {stop.tip ? (
        <View style={{ marginTop: -space.xs, marginHorizontal: space.md, padding: space.md, backgroundColor: color.brandSoft, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg }}>
          <AppText v="caption" color={color.ink}><AppText v="caption" color={color.brand} style={{ fontWeight: '800' }}>리노 팁 </AppText>{stop.tip}</AppText>
        </View>
      ) : null}
    </View>
  );
}
