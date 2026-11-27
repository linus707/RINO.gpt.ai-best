import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { DayTabs } from '@/components/DayTabs';
import { EmptyState } from '@/components/EmptyState';
import { MapView } from '@/components/MapView';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, radius, space } from '@/constants/design';
import { placeById, type Place } from '@/features/places/data';
import { cityCenter } from '@/features/trips/cities';
import { useCurrentTrip } from '@/features/trips/hooks';
import type { MapPin } from '@/lib/maps';
import { useAppStore } from '@/stores/appStore';

/** 지도 동선 — 일정 순서대로 번호 핀과 선. 날짜를 바꾸면 그날 동선만 보인다 */
export default function MapTab() {
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  if (!trip) {
    return (
      <Screen title="지도 동선">
        <EmptyState title="동선을 그릴 여행이 없어요" description="여행을 만들고 장소를 담으면 일정 순서대로 핀과 선이 그려져요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} />
      </Screen>
    );
  }
  const day = trip.days.find((d) => d.dayNumber === dayNo) ?? trip.days[0];
  const places = day.items.map((i) => placeById(i.placeId)).filter((p): p is Place => !!p);
  const pins: MapPin[] = places.map((p, i) => ({ id: p.id, order: i + 1, lat: p.lat, lng: p.lng, label: p.name, color: categoryOf(p.category).color }));
  const center = cityCenter(trip.city);

  return (
    <Screen title="지도 동선">
      <DayTabs trip={trip} withDate={false} />
      <MapView pins={pins} emptyCenter={center} onPinPress={(id) => router.push(`/place/${id}`)} />
      {places.length ? (
        <View style={{ marginTop: space.lg }}>
          <AppText v="subtitle" style={{ marginBottom: space.sm }}>{day.dayNumber}일차 이동 순서</AppText>
          {places.map((p, i) => (
            <View key={`${p.id}-${i}`}>
              <PlaceRow place={p} order={i + 1} onPress={() => router.push(`/place/${p.id}`)} />
              {i < places.length - 1 ? (
                <View style={s.leg} accessibilityLabel={`${p.name}에서 ${places[i + 1].name}로 이동`}>
                  <View style={s.legLine} />
                  <AppText v="caption" color={color.sub}>다음 장소로 이동 · 이동 시간은 추후 표시</AppText>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <EmptyState title={`${day.dayNumber}일차에 담은 장소가 없어요`} description="장소를 담으면 그 순서대로 번호 핀과 선이 그려져요." actionLabel="장소 추가" onAction={() => router.push('/place/search')} />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  leg: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg + 2, marginTop: -space.xs, marginBottom: space.xs, height: 24 },
  legLine: { width: 2, height: 24, borderRadius: radius.sm, backgroundColor: color.action, opacity: 0.4 },
});
