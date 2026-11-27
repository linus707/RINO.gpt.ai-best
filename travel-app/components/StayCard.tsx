import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, space } from '@/constants/design';
import { useResolvedPlaces } from '@/features/places/hooks';
import { refKey } from '@/features/places/types';
import type { Trip } from '@/features/trips/types';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** 일정 맨 위: 정한 숙소 (없으면 후보 비교로 안내) */
export function StayCard({ trip }: { trip: Trip }) {
  const { byKey } = useResolvedPlaces(trip.stay ? [trip.stay] : []);
  const p = trip.stay ? byKey.get(refKey(trip.stay)) : undefined;
  return (
    <Pressable onPress={() => router.push('/trip/stay')} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <View style={s.badge}><AppText v="caption" color={color.white} style={{ fontWeight: '800' }}>숙</AppText></View>
      <View style={{ flex: 1 }}>
        {trip.stay ? (
          <>
            <AppText v="bodyBold" numberOfLines={1}>{p?.name ?? '숙소 정보를 불러오는 중…'}</AppText>
            <AppText v="caption" color={color.sub}>정한 숙소 · 눌러서 후보 비교·변경</AppText>
          </>
        ) : (
          <>
            <AppText v="bodyBold">숙소를 아직 정하지 않았어요</AppText>
            <AppText v="caption" color={color.sub}>후보를 모아 일정과의 거리로 비교해 보세요</AppText>
          </>
        )}
      </View>
      <Icon name="chevron" size={18} color={color.faint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.md, marginBottom: space.md, borderWidth: 1, borderColor: color.line },
  badge: { width: 28, height: 28, borderRadius: 6, backgroundColor: color.brand, alignItems: 'center', justifyContent: 'center' },
});
