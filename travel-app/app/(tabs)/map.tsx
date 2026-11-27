import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PlaceRow } from '@/components/Cards';
import { DayTabs } from '@/components/DayTabs';
import { EmptyState } from '@/components/EmptyState';
import { MapView } from '@/components/MapView';
import { Screen } from '@/components/Screen';
import { categoryOf } from '@/constants/categories';
import { color, space } from '@/constants/design';
import { placeById, SAMPLE_PLACES } from '@/features/places/data';
import { useCurrentTrip } from '@/features/trips/hooks';
import type { MapPin } from '@/lib/maps';
import { useAppStore } from '@/stores/appStore';

/** 지도 동선 — 일정 순서 = 동선. Phase 1은 지도 자리 + 샘플 핀 1개 */
export default function MapTab() {
  const { trip } = useCurrentTrip();
  const dayNo = useAppStore((s) => s.selectedDay);
  const day = trip?.days.find((d) => d.dayNumber === dayNo) ?? trip?.days[0];
  const places = (day?.items ?? []).map((i) => placeById(i.placeId)).filter((p) => !!p);
  const sample = places.length === 0;
  const shown = sample ? [SAMPLE_PLACES[0]] : places;
  const pins: MapPin[] = shown.map((p, i) => ({ id: p.id, order: i + 1, lat: p.lat, lng: p.lng, label: p.name, color: categoryOf(p.category).color }));

  return (
    <Screen title="지도 동선">
      {trip ? <DayTabs trip={trip} withDate={false} /> : null}
      <MapView pins={pins} onPinPress={(id) => router.push(`/place/${id}`)} />
      {sample ? <AppText v="caption" color={color.sub} style={{ marginTop: space.sm }}>샘플 핀 · 일정에 장소를 담으면 그 순서대로 핀과 선이 그려져요</AppText> : null}
      <View style={{ marginTop: space.lg }}>
        {trip ? (
          shown.map((p, i) => <PlaceRow key={p.id} place={p} order={i + 1} onPress={() => router.push(`/place/${p.id}`)} />)
        ) : (
          <EmptyState title="동선을 그릴 여행이 없어요" description="여행을 만들면 일정 순서대로 핀과 선이 그려져요." actionLabel="여행 만들기" onAction={() => router.push('/trip/new')} />
        )}
      </View>
    </Screen>
  );
}
